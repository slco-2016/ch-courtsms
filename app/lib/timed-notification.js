
const resourceRequire = require('./resourceRequire')

// SECRET STUFF
var credentials = require("../../credentials");
var ACCOUNT_SID = credentials.accountSid;
var AUTH_TOKEN = credentials.authToken;
var TWILIO_NUM = credentials.twilioNum;

// DB via knex.js to run queries
var db  = require("../app/db");

// Twilio tools
var twilio = require("twilio");
var twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages')
const Notifications = resourceRequire('models', 'Notifications')

const voice = resourceRequire('lib', 'voice')

module.exports = {

  function sendOVMNotification(n) {
    OutboundVoiceMessages.findById(n.ovm_id)
    .then((ovm) => {
      return voice.processPendingOutboundVoiceMessages(ovm)
    }).catch((err) => {
      console.log(err)
    })
  };

  function sendTwilioSMS (n) {

      var sendToObject = {
        to: n.value,
        from: TWILIO_NUM,
        body: n.message
      }

      twClient
      .sendSms(sendToObject, function (err, msg) {
        if (err) {
          console.log("Twilio send error: ", err);

        // Register message in database
        } else {
          db("msgs")
          .insert({
            convo:     n.convoID,
            comm:      n.comm,
            content:   n.message,
            inbound:   false,
            read:      true,
            tw_sid:    msg.sid,
            tw_status: msg.status
          })
          .returning("msgid")
          .then(function (msgs) {

            // Update latest activity on convo
            db("convos")
            .where("convid", n.convoID)
            .update({updated: db.fn.now()})
            .then(function (success) {

              // Need to mark notification as sent
              db("notifications")
              .where("notificationid", n.notificationid)
              .update({
                sent: true
              }).then(function (success) {
                console.log("Sent message.");

              }).catch(function (err) {
                console.error(err);
              });

            }).catch(function (err) {
              console.log(err);
            })
          }).catch(function (err) {
            console.log(err);
          })
        }
      });

  };

};


