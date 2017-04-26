const Promise = require('bluebird');

const credentials = require('../../credentials');
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;

// Twilio tools
const twilio = require('twilio');
const twClient = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);

const sms = require('./sms');
const resourceRequire = require('../lib/resourceRequire');

const Communications = resourceRequire('models', 'Communications');
const Conversations = resourceRequire('models', 'Conversations');
const Messages = resourceRequire('models', 'Messages');
const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages');
const Recordings = resourceRequire('models', 'Recordings');
const Departments = resourceRequire('models', 'Departments');
const PhoneNumbers = resourceRequire('models', 'PhoneNumbers');
const Users = resourceRequire('models', 'Users');

module.exports = {

  // Makes the call from Twilio to get the case manager to record a voice
  // message for a client to be sent at a later date (as a notification)
  recordVoiceMessage(user, commId, clientId, deliveryDate, phoneNumber, domain) {
    // Concat parameters so that callback goes to recording endpoint with all
    // data needed to know where to save that recording at
    let params = `?userId=${user.cmid}&commId=`;
    params += `${commId}&deliveryDate=${deliveryDate.getTime()}`;
    params += `&clientId=${clientId}`;
    params += '&type=ovm';

    // TODO: The callback URL is set in credentials
    // Problem: This requires the credentials.js file to be custom set for
    // every deployment with regards to the Twilio address. Is there a way
    // to programmatically grab the domain?
    if (!domain) {
      domain = credentials.twilio.outboundCallbackUrl;
    }

    return new Promise((fulfill, reject) => {
      // find the right 'from' phone number, via the department
      Departments.findOneByAttribute('department_id', user.department)
        .then(department => {
          return PhoneNumbers.findById(department.phone_number);
        })
        .then(departmentPhoneNumber => {
          const sentFromValue = departmentPhoneNumber.value;
          const url = `${domain}/webhook/voice/record/${params}`;
          const opts = {
            url,
            to: phoneNumber,
            from: sentFromValue,
          };

          // Execute the call with Twilio Node lib
          twClient.calls.create(opts, (err, call) => {
            if (err) {
              reject(err);
            } else {
              // Response is (so far) not used, we leave it to the user to
              // click "Go to notifications" to proceed
              fulfill(call);
            }
          });
        })
        .catch(reject);
    });

  },

  addInboundRecordingAndMessage(communication, recordingKey, recordingSid, toNumber) {
    return new Promise((fulfill, reject) => {
      let recording,
        conversations,
        clients;

      return Recordings.create({
        comm_id: communication.commid,
        recording_key: recordingKey,
        RecordingSid: recordingSid,
        call_to: toNumber,
      }).then((resp) => {
        recording = resp;

        return sms.retrieveClients(recording.call_to, communication);
      }).then((resp) => {
        clients = resp;

        return Conversations.retrieveByClientsAndCommunication(clients, communication);
      }).then((resp) => {
        conversations = resp;

        const conversationIds = conversations.map(conversation => conversation.convid);

        return Messages.insertIntoManyConversations(
          conversationIds,
          communication.commid,
          'Untranscribed inbound voice message',
          recordingSid,
          'received',
          toNumber, {
            recordingId: recording.id,
          }
        );
      }).then((resp) => {
        fulfill();
      }).catch(reject);
    });
  },

  addOutboundRecordingAndMessage(commId, recordingKey, recordingSid, clientId, userId, status) {
    return new Promise((fulfill, reject) => {
      // Reference variables
      let conversation,
        recording;

      return Recordings.create({
        comm_id: commId,
        recording_key: recordingKey,
        RecordingSid: recordingSid,
        call_to: null, // this is only used with inbound messages/calls/etc.
      }).then((resp) => {
        recording = resp;

        // Create a new conversation
        const subject = 'Outbound Voice Call';
        const open = true;
        return Conversations.create(userId, clientId, subject, open);
      }).then((resp) => {
        conversation = resp;

        return Messages.insertIntoManyConversations(
          [conversation.convid, ],
          commId,
          'Untranscribed outbound voice message', // Default content for message
          recordingSid,
          status,
          null, // This is the "toNumber" or "call_to" which is only used on inbound (see above)
          { recordingId: recording.id } // Fkey pointing Recordings table
        );
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  },

  processPendingOutboundVoiceMessages(ovm, user_id, domain) {
    domain = domain || credentials.twilio.outboundCallbackUrl;

    let sentFromValue;
    return new Promise((fulfill, reject) => {
      // don't create the call if we're testing
      if (credentials.CCENV === 'testing') {
        return fulfill();
      }

      // get the right 'from' phone number
      Users.findOneByAttribute('cmid', user_id)
        .then(user => {
          return Departments.findOneByAttribute('department_id', user.department);
        })
        .then(department => {
          return PhoneNumbers.findById(department.phone_number);
        })
        .then(departmentPhoneNumber => {
          sentFromValue = departmentPhoneNumber.value;
          // get the right 'to' phone number
          return Communications.findById(ovm.commid);
        })
        .then(comm => {
          // create the call
          twClient.calls.create(
            {
              url: `${domain}/webhook/voice/play-message/?ovmId=${ovm.id}`,
              to: comm.value,
              from: sentFromValue,
              IfMachine: 'Continue',
              record: true,
              statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed',],
              StatusCallback: `${domain}/webhook/voice/status`,
            },
            (err, call) => {
              if (err) {
                reject(err);
              } else {
                // Update the OVM table row with the sid of the call that
                // was just placed out to the client (this is the SID of
                // the "voicemail delivery call")
                ovm
                  .update({ call_sid: call.sid })
                  .then(ovm => {
                    fulfill(ovm);
                  }).catch(reject);
              }
            }
          );
        }).catch(reject);
    });
  },

  // TODO: Why do we have a special method just for tests
  //       should be using "normal" methods
  sendPendingOutboundVoiceMessages(domain) {
    domain = domain || credentials.twilio.outboundCallbackUrl;

    let ovmId;
    return new Promise((fulfill, reject) => {
      OutboundVoiceMessages.getNeedToBeSent()
      .map(ovm => this.processPendingOutboundVoiceMessages(ovm, domain)).then((ovms) => {
        fulfill(ovms);
      }).catch(reject);
    });
  },
};
