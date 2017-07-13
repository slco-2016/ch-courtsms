const Promise = require('bluebird');
// initialize twilio client
const {
  accountSid: ACCOUNT_SID,
  authToken: AUTH_TOKEN,
} = require('../../credentials');
const TwilioFactory = require('twilio');
const twilioClient = new TwilioFactory(ACCOUNT_SID, AUTH_TOKEN);

module.exports = {
  sendMessage(to, from, body) {
    const msg = twilioClient.messages.create({to: to, from: from, body: body});
    return Promise.resolve(msg);
  },

  getMessageInfo(twilioSID) {
    const msg = twilioClient.messages(twilioSID).fetch();
    return Promise.resolve(msg);
  },

  createCall(opts) {
    const call = twilioClient.calls.create(opts);
    return Promise.resolve(call);
  },

  updateNumber(numberSID, url) {
    const upd = twilioClient.incomingPhoneNumbers(numberSID)
      .update({
        SmsUrl: `${url}/webhook/sms`,
        VoiceUrl: `${url}/webhook/voice`,
        StatusCallback: `${url}/webhook/voice/status`,
      });
    return Promise.resolve(upd);
  },
};
