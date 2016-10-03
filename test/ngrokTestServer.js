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
		    StatusCallback: `${url}/webhook/status`,
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