const ngrok = require('ngrok')
const credentials = require("../credentials");
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const TWILIO_NUM = credentials.twilioNum;
const twilio = require("twilio");
const twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

module.exports = function(port, callback) {
  ngrok.connect(port, function (err, url) {
    console.log(`Hosting port ${port} at`, url)
    console.log("View inbound requests at http://127.0.0.1:4040")
    twClient.incomingPhoneNumbers("PN6dddda052b1a0ff37b7228c470f1575b")
    .update({
        SmsUrl: `${url}/webhook/sms`,
        VoiceUrl: `${url}/webhook/voice`,
        StatusCallback: `${url}/webhook/voice/status`,
    }, function(err, phoneNumber) {
        if (err) {
          throw err
        } else {
          console.log("Updated webhooks for", phoneNumber.phoneNumber)
          callback(url)
        }
    });
  });
}
  updateWebhooks(domain, hostUrl) {
    mailgunReq(
      'put',
      `${domain}/webhooks/deliver`, 
      {url: hostUrl + "webhool/email/status"}, 
      (error) => {
        if (error) { reject(error) }
        mailgunReq(
          'put',
          `${domain}/webhooks/open`, 
          {url: hostUrl + "webhool/email/status"}, 
          (error) => {
            if (error) { reject(error) }
          }
        )
      }
    )
  }
}
_mailgunWebhookUpdate = (name, url, callback) => {
  request({
    method: 'put',
    url: "https://api.mailgun.net/v3/clientcomm.org/webhooks/" + name,
    formData: {url: url},
    auth: {
      user: 'api',
      password: credentials.mailgun.apiKey,
    },
  }, callback)  
}
