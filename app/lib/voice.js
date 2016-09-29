const Promise = require("bluebird");

var credentials = require("../../credentials");
var ACCOUNT_SID = credentials.accountSid;
var AUTH_TOKEN = credentials.authToken;
var TWILIO_NUM = credentials.twilioNum;

// Twilio tools
var twilio = require("twilio");
var twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

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
  }
}