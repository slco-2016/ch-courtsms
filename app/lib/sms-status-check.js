



// SECRET STUFF
const credentials = require('../../credentials');
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const TWILIO_NUM = credentials.twilioNum;



// DEPENDENCIES
// DB via knex.js to run queries
const db  = require('../app/db');

// Twilio tools
const twilio = require('twilio');
const twClient = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);

// Email tools
const emNotify = require('../utils/em-notify');
const notifyUserFailedSend = emNotify.notifyUserFailedSend;



module.exports = {

  checkSMSstatus: function () {

    db.select('*')
    .from('msgs')
    .leftJoin('comms', 'comms.commid', 'msgs.comm')
    .whereNot('msgs.status_cleared', true)
    .and.whereNotNull('tw_sid')
    .then(function (msgs) {

      console.log('Running status check for ' + msgs.length + ' messages.');

      // Iterate through list, checking to see if any have changes status
      for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i];
        if (msg.tw_sid) checkMsgAgainstTwilio(msg);
      }
      
    }).catch(function (err) { console.log(err); });

  },

};


// UTILITY
function checkMsgAgainstTwilio (msg) {

  // Hit up Twilio API for the 
  twClient.sms.messages(msg.tw_sid)
  .get(function (err, sms) {

    if (err) {
      console.log('Twilio error: ');
      console.log(err);
      console.log('-- \n');

    // Handling for messages sent from client to Twilio
    } else if (sms.direction == 'inbound') {
      
      // If no change occured over msg prior status
      if (msg.tw_status == sms.status) {
        // We can close out cleared messages
        if (sms.status == 'received') {
          db('msgs')
          .where('msgid', msg.msgid)
          .update({status_cleared: true,})
          .then(function (success) {
            console.log('Cleared msg ' + msg.msgid);
          }).catch(function (err) { console.log(err); });
        }

      // There was a change
      } else {
        // The message changed to a valud we accept as closed
        if (sms.status == 'received') {
          db('msgs')
          .where('msgid', msg.msgid)
          .update({status_cleared: true,})
          .then(function (success) {
            console.log('Cleared msg ' + msg.msgid);
          }).catch(function (err) { console.log(err); });
        }
      }

    // Handling for messages sent from case manager to Twilio
    } else {

      // If no change occured over msg prior status
      if (msg.tw_status == sms.status) {
        // We can close out cleared messages
        if (sms.status == 'sent' || sms.status == 'delivered' || sms.status == 'failed') {
          db('msgs')
          .where('msgid', msg.msgid)
          .update({status_cleared: true,})
          .then(function (success) {
            console.log('Cleared msg ' + msg.msgid);
          }).catch(function (err) { console.log(err); });
        
        // Check that message is not stuck in queue
        } else {
          const created = new Date(msg.created);
          const now     = new Date();
          const hrDiff  = Math.floor((now - created)/36e5);

          // It has been queued for too long
          // Should report this to the case manager
          if (hrDiff > 1) {
            db('msgs')
            .where('msgid', msg.msgid)
            .update({status_cleared: true,})
            .then(function (success) {
              console.log('Cleared msg ' + msg.msgid + ', but it failed to send.');
              
              // Send an email to the case manager
              db('cms')
              .join('convos', 'cms.cmid', 'convos.cm')
              .where('convos.convid', msg.convo)
              .then(function (cms) {

                // Can only send if we find a cm associated with that convo
                // TO DO: Include information about the client in the email
                if (cms.length > 0) {
                  const cm = cms[0];
                  notifyUserFailedSend(cm, msg);  
                }
                
              }).catch(function (err) { console.log(err); });

            }).catch(function (err) { console.log(err); });
          }
        }

      // There was a change
      } else {
        // Results indicate msg can also be closed
        if (sms.status == 'sent' || sms.status == 'failed') {
          db('msgs')
          .where('msgid', msg.msgid)
          .update({tw_status: sms.status, status_cleared: true,})
          .then(function (success) {
            console.log('Cleared msg ' + msg.msgid);
          }).catch(function (err) { console.log(err); });

        // Update status but do not close out
        } else {
          db('msgs')
          .where('msgid', msg.msgid)
          .update({tw_status: sms.status,})
          .then(function (success) {
            console.log('Cleared msg ' + msg.msgid);
          }).catch(function (err) { console.log(err); });

        }
      }

    }

  });
};



