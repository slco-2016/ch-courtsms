const Promise = require('bluebird');

const credentials = require('../../credentials');
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const TWILIO_NUM = credentials.twilioNum;

// Twilio tools
const twilio = require('twilio');
const twClient = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);

const OutboundVoiceMessages = require('../models/outboundVoiceMessages');
const Communications = require('../models/communications');

module.exports = {
  
  recordVoiceMessage(user, commId, clientId, deliveryDate, phoneNumber, domain) {
    let params = `?userId=${user.cmid}&commId=`;
    params += `${commId}&deliveryDate=${deliveryDate.getTime()}`;
    params += `&clientId=${clientId}`;
    params += '&type=ovm';

    if (!domain) {
      domain = credentials.rootUrl;  
    }

    const url = `${domain}/webhook/voice/record/${params}`;
    return new Promise((fulfill, reject) => {
      twClient.calls.create({
        url: url,
        to: phoneNumber,
        from: credentials.twilioNum,
      }, (err, call) => {
        if (err) {
          reject(err);
        } else {
          fulfill(call);  
        }
      });
    });
  },

  addRecordingAndMessage(communicationObj, recordingKey, recordingSid, toNumber) {
    return new Promise((fulfill, reject) => {
      let recording, conversations, clients;

      return Recordings.create({
        comm_id: communication.commid,
        recording_key: key,
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
          'Untranscribed voice message',
          recordingSid,
          'recieved',
          toNumber, {
            recordingId: recording.id,
          }
        );
      });
    });
  },

  processPendingOutboundVoiceMessages(ovm, domain) {
    domain = domain || credentials.rootUrl;  

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
            ovm.update({call_sid: call.sid,})
            .then((ovm) => {
              fulfill(ovm);
            }).catch(reject);
          }
        });
      }).catch(reject);
    });
  },

  sendPendingOutboundVoiceMessages(domain) {
    domain = domain || credentials.rootUrl;  

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