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
  recordVoiceMessage(user, client, deliveryDate, phoneNumber) {
    let domain = "https://c784b5e8.ngrok.io"
    let params = `?userId=${user.cmid}&clientId=`+
      `${client.clid}&deliveryDate=${deliveryDate.getTime()}`
    let url = `${domain}/webhook/voice/record/${params}`
    return new Promise((fulfill, reject) => {
      twClient.calls.create({
          url: url,
          to: phoneNumber,
          from: credentials.twilioNum,
      }, function(err, call) {
        console.log(err)
        console.log(call.sid);
      });
    })
  },
  sendPendingOutboundVoiceMessages() {
    return new Promise((fulfill, reject) => {
      OutboundVoiceMessages.getNeedToBeSent()
      .map((ovm) => {
        return Clients.findById(ovm.client_id)
        .then((client) => {
          return client.communications()
        }).then((communications) => {
          fulfill(communications)
        })
      }).catch(reject)
    })
  }
}