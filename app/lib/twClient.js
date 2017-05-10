const {
  accountSid: ACCOUNT_SID,
  authToken: AUTH_TOKEN,
} = require('../../credentials');

const twilio = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);

/*
 This module wraps twilio for the purpose of allowing the underlying methods to be stubbed in test.

 For example, stub a method like so:

   const simple = require('simple-mock');
   simple.mock(twClient, 'sendMessage')
*/
module.exports = {
  sendMessage: twilio.sendMessage,
};
