const Promise = require("bluebird");

const credentials = require("../../credentials");
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const TWILIO_NUM = credentials.twilioNum;

// Twilio tools
const twilio = require("twilio");
const twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

const OutboundVoiceMessages = require('../models/outboundVoiceMessages')
const Clients = require('../models/clients')

module.exports = {
  recordVoiceMessage(domain, user, client, deliveryDate, phoneNumber) {
    let params = `?userId=${user.cmid}&clientId=`+
      `${client.clid}&deliveryDate=${deliveryDate.getTime()}`
    let url = `${domain}/webhook/voice/record/${params}`
    return new Promise((fulfill, reject) => {
      twClient.calls.create({
        url: url,
        to: phoneNumber,
        from: credentials.twilioNum,
      }, (err, call) => {
        if (err) {
          reject(err)
        } else {
          fulfill(call)  
        }
      });
    })
  },
  _processPendingOutboundVoiceMessages(ovm, domain) {
    return new Promise((fulfill, reject) =>{
      ovmId = ovm.id
      return Clients.findById(ovm.client_id)
      .then((client) => {
        return client.communications()
    }).then((communications) => {
        // TODO use best communication
        twClient.calls.create({
          url: `${domain}/webhook/voice/play-message/?ovmId=${ovmId}`,
          to: communications[0].value,
          from: credentials.twilioNum,
          IfMachine: 'Continue',
          record: true,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          StatusCallback: `${domain}/webhook/voice/status`,
        }, (err, call) => {
          if (err) {
            reject(err)
          } else {
            ovm.update({call_sid: call.sid})
            .then((ovm) => {
              fulfill(ovm)
            }).catch(reject)
          }
        })
      })
    })
  },
  sendPendingOutboundVoiceMessages(domain) {
    let ovmId
    return new Promise((fulfill, reject) => {
      OutboundVoiceMessages.getNeedToBeSent()
      .map((ovm) => {
        return this._processPendingOutboundVoiceMessages(ovm, domain)
      }).then((ovms) => {
        fulfill(ovms)
      }).catch(reject)
    })
  }
}