const ngrok = require('ngrok');
const smsService = require('../app/lib/sms-service');

module.exports = function (port, callback) {
  ngrok.connect(port, (ngrokerr, url) => {
    console.log(`Hosting port ${port} at `, url);
    console.log('View inbound requests at http://127.0.0.1:4040');
    smsService.updateNumber('PN6dddda052b1a0ff37b7228c470f1575b', url)
      .then(resp => {
        console.log(`Updated webhooks for ${resp.phoneNumber}`);
        callback(url);
      }).catch(smserr => reject(smserr));
  });
};
