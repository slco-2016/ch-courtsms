const Promise = require('bluebird');

const credentials = require('../../credentials');
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const TWILIO_NUM = credentials.twilioNum;

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

module.exports = {
  
  // Makes the call from Twilio to get user (case manager)
  // to record a voice message for a client to be sent
  // at a later date (as a notification)
  recordVoiceMessage(user, commId, clientId, deliveryDate, phoneNumber, domain) {

    // Concat parameters so that callback goes to recording
    // endpoint with all data needed to know where to save
    // that recording at
    let params = `?userId=${user.cmid}&commId=`;
        params += `${commId}&deliveryDate=${deliveryDate.getTime()}`;
        params += `&clientId=${clientId}`;
        params += '&type=ovm';

    // TODO: The callback URL is set in credentials
    // Problem: This requires the credentials.js file to be
    // custom set for every deployment with regards to the Twilio
    // address. Is there a way to programmatically grab the domain?
    if (!domain) {
      domain = credentials.twilio.outboundCallbackUrl;  
    }

    const url  = `${domain}/webhook/voice/record/${params}`;
    const opts = {
      url:  url,
      to:   phoneNumber,
      from: credentials.twilioNum,
    };

    // Execute the call with Twilio Node lib
    return new Promise((fulfill, reject) => {
      twClient.calls
      .create(opts, (err, call) => {
        if (err) {
          reject(err);
        } else {

          // Response is (so far) not used, we leave it to the user to 
          // click "Go to notifications" to proceed
          fulfill(call);  
        }
      });
    });
  },

  addInboundRecordingAndMessage(communication, recordingKey, recordingSid, toNumber) {
    return new Promise((fulfill, reject) => {
      let recording, conversations, clients;

      return Recordings.create({
        comm_id: communication.commid,
        recording_key: recordingKey,
        RecordingSid: recordingSid,
        call_to: toNumber,
      }).then((resp) => {
        recording = resp;

        return sms.retrieveClients(recording.call_to, communication);
      }).then((resp) =>{
        clients = resp;

        return Conversations.retrieveByClientsAndCommunication(clients, communication);
      }).then((resp) => {
        conversations = resp;

        const conversationIds = conversations.map((conversation) => {
          return conversation.convid;
        });

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

  addOutboundRecordingAndMessage(commId, recordingKey, recordingSid, clientId, userId) {
    return new Promise((fulfill, reject) => {
      // Reference variables
      let conversation, recording;

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
          'received',
          null, // This is the "toNumber" or "call_to" which is only used on inbound (see above)
          { recordingId: recording.id, } // Fkey pointing Recordings table
        );
      }).then(() => {
        fulfill();
      }).catch(reject);

    });
  },

  processPendingOutboundVoiceMessages(ovm, domain) {
    domain = domain || credentials.twilio.outboundCallbackUrl;

    return new Promise((fulfill, reject) =>{
      ovmId = ovm.id;

      return Communications.findById(ovm.commid)
      .then((communication) => {
        twClient.calls.create({
          url: `${domain}/webhook/voice/play-message/?ovmId=${ovmId}`,
          to: communication.value,
          from: credentials.twilioNum,
          IfMachine: 'Continue',
          record: true,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed',],
          StatusCallback: `${domain}/webhook/voice/status`,
        }, (err, call) => {
          if (err) {
            reject(err);
          } else {

            // Update the OVM table row with the sid of the call that was just placed 
            // out to the client (so this is the SID of the "voicemail delivery call")
            ovm.update({call_sid: call.sid, })
            .then((ovm) => {
              fulfill(ovm);
            }).catch(reject);
          }
        });
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
      .map((ovm) => {
        return this.processPendingOutboundVoiceMessages(ovm, domain);
      }).then((ovms) => {
        fulfill(ovms);
      }).catch(reject);
    });
  },
};