const relativeRequire = require('./relativeRequire');

// SECRET STUFF
const credentials = require('../../credentials');
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const TWILIO_NUM = credentials.twilioNum;

// DB via knex.js to run queries
const db  = require('../app/db');

// Twilio tools
const twilio = require('twilio');
const twClient = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);

const OutboundVoiceMessages = relativeRequire('models', 'OutboundVoiceMessages');
const Notifications = relativeRequire('models', 'Notifications');

const voice = relativeRequire('lib', 'voice');

module.exports = {

  checkAndSendNotifications: function () {
    db('notifications')
    .select('notifications.*', 'comms.type', 'comms.value')
    .leftJoin('comms', 'notifications.comm', 'comms.commid')
    .where('send', '<', db.fn.now())
    .andWhere('notifications.sent', false)
    .andWhere('notifications.closed', false)
    .then(function (notifications) {

      notifications.forEach(function (n) {
        // Only send out for cell values at the moment
        if (n.type == 'cell') {
          initiateNotificationSend(n);
          try {
            console.log('Sending message: ', n.notificationid);
          } catch (e) {
            console.log(e);
          }
        }
      });

      if (notifications.length == 0) {
        console.log('No new messages need to be sent.');
      }

    }).catch(function (err) {
      console.log(err);
    });
  },

};


function initiateNotificationSend (n) {
  if (n.ovm_id) {
    sendOVMNotification(n);
  } else {
    const client = n.client;
    db('convos')
    .where('convos.client', client)
    .andWhere('convos.accepted', true)
    .andWhere('convos.open', true)
    .orderBy('convos.updated', 'desc')
    .limit(1)
    .then(function (convos) {

      if (convos.length == 0) {

        const insertObj = {
          cm:       n.cm,
          client:   n.client,
          subject:  n.subject,
          open:     true,
          accepted: true,
        };

        db('convos')
        .insert(insertObj)
        .returning('convid')
        .then(function (convoIDs) {
          const convoID = convoIDs[0];
          n.convoID = convoID;
          sendTwilioSMS(n);

        }).catch(function (err) { 
          console.log(err); 
        });

      } else {
        const convoID = convos[0].convid;
        n.convoID = convoID;
        sendTwilioSMS(n);
      }
    }).catch(function (err) {
      console.log(err);
    });    
  }
};

function sendOVMNotification(n) {
  OutboundVoiceMessages.findById(n.ovm_id)
  .then((ovm) => {
    return voice.processPendingOutboundVoiceMessages(ovm);
  }).catch((err) => {
    console.log(err);
  });
}


function sendTwilioSMS (n) {

  const sendToObject = {
    to: n.value,
    from: TWILIO_NUM,
    body: n.message,
  };

  twClient
    .sendSms(sendToObject, function (err, msg) {
      if (err) {
        console.log('Twilio send error: ', err);

      // Register message in database
      } else {
        db('msgs')
        .insert({
          convo:     n.convoID,
          comm:      n.comm,
          content:   n.message,
          inbound:   false,
          read:      true,
          tw_sid:    msg.sid,
          tw_status: msg.status,
        })
        .returning('msgid')
        .then(function (msgs) {

          // Update latest activity on convo
          db('convos')
          .where('convid', n.convoID)
          .update({updated: db.fn.now(),})
          .then(function (success) {

            // Need to mark notification as sent
            db('notifications')
            .where('notificationid', n.notificationid)
            .update({
              sent: true,
            }).then(function (success) {
              console.log('Sent message.');

            }).catch(function (err) {
              console.error(err);
            });

          }).catch(function (err) {
            console.log(err);
          });
        }).catch(function (err) {
          console.log(err);
        });
      }
    });

};



