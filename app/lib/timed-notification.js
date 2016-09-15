


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


module.exports = {

  checkAndSendNotifications: function () {
    db("notifications")
    .select("notifications.*", "comms.type", "comms.value")
    .leftJoin("comms", "notifications.comm", "comms.commid")
    .where("send", "<", db.fn.now())
    .andWhere("notifications.sent", false)
    .andWhere("notifications.closed", false)
    .then(function (notifications) {

      notifications.forEach(function (n) {
        // Only send out for cell values at the moment
        if (n.type == "cell") {
          initiateNotificationSend(n);
          try {
            console.log("Sending message: ", n.notificationid);
          } catch (e) {
            console.log(e);
          }
        }
      });

      if (notifications.length == 0) {
        console.log("No new messages need to be sent.")
      }

    }).catch(function (err) {
      console.log(err);
    })
  }

};


function initiateNotificationSend (n) {
  var client = n.client;
  db("convos")
  .where("convos.client", client)
  .andWhere("convos.accepted", true)
  .andWhere("convos.open", true)
  .orderBy("convos.updated", "desc")
  .limit(1)
  .then(function (convos) {

    if (convos.length == 0) {

      var insertObj = {
        cm:       n.cm,
        client:   n.client,
        subject:  n.subject,
        open:     true,
        accepted: true
      };

      db("convos")
      .insert(insertObj)
      .returning("convid")
      .then(function (convoIDs) {
        var convoID = convoIDs[0];
        n.convoID = convoID;
        sendTwilioSMS(n)

      }).catch(function (err) { 
        console.log(err); 
      });

    } else {
      var convoID = convos[0].convid;
      n.convoID = convoID;
      sendTwilioSMS(n)
    }
  }).catch(function (err) {
    console.log(err);
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



