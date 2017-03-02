const db = require('../../app/db');
const Promise = require('bluebird');
const moment = require('moment');

const credentials = require('../../credentials');
const mailgun = require('./mailgun');

// Include some models
const Users = require('../models/users');
const CaptureBoard = require('../models/capture');

module.exports = {

  // the purpose is to email case managers/users if they have unread messages
  // then we email them with an alert that they do
  runEmailUpdates() {
    return new Promise((fulfill, reject) => {
      // reference variables
      let userIds;
      let usersThatNeedToBeAlerted;

      // current date information
      const dayOfTheWeek = new Date().getDay();
      const hourOfTheDay = new Date().getHours();

      // Basically each user has an attribute "email_alert_frequency"
      // it is an integer set to a "number of hours" between which they would
      // like to get email alerts for unread messages.
      // We determine if it is "the right day" of the week by querying for those with an
      // alerts frequency integer that is less than the interval we come up with
      // in the below logic block.
      // TODO: Vastly improve.
      let interval = 25; // hours
      if ([1, 3, 5, ].indexOf(dayOfTheWeek) > -1) {
        interval = 50;
      } else if (dayOfTheWeek == 4) {
        interval = 175;
      }

      // TODO: Do not execute raw queries here, either move to a lib or user Model Classes
      // We jsut want to query for the users who qualify for this runs email update process
      db('cms')
        .where('email_alert_frequency', '<', interval)
        .andWhere('active', true)
      .then((resp) => {
        // We just want the userIds from the response
        userIds = resp.map(user => user.cmid);

        // want a sum total and only of unreads
        const rawQuery = `SELECT ` +
                         `count(msgid), ` +
                         `MAX(msgs.created) AS made, ` +
                         `cms.cmid, ` +
                         `cms.first, ` +
                         `cms.last, ` +
                         `cms.email ` +
                         `FROM msgs ` +
                         // left joins allow us to a link a message to a 
                         // conversation, then to a user (from client to user)
                         `LEFT JOIN (SELECT convos.convid, convos.cm FROM convos) AS convos ` +
                         `ON (convos.convid = msgs.convo) ` +
                         `LEFT JOIN (SELECT cms.cmid, cms.first, cms.last, cms.email FROM cms) AS cms ` +
                         `ON (cms.cmid = convos.cm) ` +
                         // within this bracketed period of time (only of unreads)
                         `WHERE msgs.read = FALSE ` +
                         `AND msgs.created > CURRENT_TIMESTAMP - INTERVAL '1 day' ` +
                         `AND msgs.created < CURRENT_TIMESTAMP ` +
                         // group them by unique users
                         `GROUP BY cms.cmid, cms.first, cms.last, cms.email ` +
                         `ORDER BY made DESC;`;

        // executes the above query
        return db.raw(rawQuery);
      }).then((resp) => {
        // if you run a raw query, then you have to extract the rows
        // from the resp object hence resp.rows
        usersThatNeedToBeAlerted = resp.rows;

        // we are going to filter out any users that should not be updated on this run
        usersThatNeedToBeAlerted = usersThatNeedToBeAlerted.filter(user => userIds.indexOf(user.cmid) > -1);

        // iterate over the resulting users list, and create a message object for each, then
        // send a message through mailgun
        const emailPromises = usersThatNeedToBeAlerted.map((msg, i) => {
          // the message copy that will be emailed
          const text = `Hello, ${msg.first} ${msg.last},` +
                       `You are receiving this automated email because ` +
                       `you have ${msg.count} message(s) waiting for you ` +
                       `in ClientComm. To view this message go to ` +
                       `ClientComm.org and login with your user name ` +
                       `and password. If you are having issues accessing ` +
                       `your account, send an email to clientcomm@codeforamerica.org ` +
                       `and we will be happy to assist you any time, day or night!`;

          // Send mail with defined transport object
          if (credentials.CCENV === 'testing') {
            return Promise.resolve();
          } else {
            return mailgun.sendEmail(
              msg.email,
              '"ClientComm - CJS" <clientcomm@codeforamerica.org>',
              'Alert: New Unread ClientComm Messages!',
              text
            );
          }
        });

        return Promise.all(emailPromises);
      })
        .then(fulfill)
        .catch(reject);
    });
  },

  notifyUserFailedSend(cm, msg) {
    const text = `Hi, ${cm.first}. You are receiving this email because a ` +
                 `message you wrote failed to send. This was not your fault ` +
                 `- it was likely an error with the SMS service provider.` +

                 `\n<b>What was the message?</b> ` +
                 `The contents of the message are included below:` +

                 `\n"${msg.content}"` +

                 `\n<b>More details:</b> The message was sent ` +
                 `at ${moment(msg.created).format('h:mmA on dddd, MMMM Do, YYYY')}. ` +
                 `Its last known status was: ${msg.tw_status}.` +

                 `\n<b>What should I do?</b> ` +
                 `Please check the message and send it again, if needed.` +

                 `\nThanks much and apologies for the inconvenience.`;

    const html = `<p>${text.split('\n').join('</p><p>')}</p>`;

    mailgun.sendEmail(
      cm.email,
      '"ClientComm - CJS" <clientcomm@codeforamerica.org>',
      'Alert: Error sending message from ClientComm!',
      html
    ).catch(error => console.error('Error sending notifyUserFailedSend email:', error));
  },

  sendPassResetEmail(cm, uid) {
    const text = `Hello, ${cm.first} ${cm.last}. You are receiving this email ` +
                 `because your account (${cm.email}) has requested a password reset.` +

                 `\nIf this was not you, you don't need to do anything. If it ` +
                 `was you and you did intend to reset your password, please go to the ` +
                 `following address by either clicking on or cutting and ` +
                 `pasting the following address:` +

                 `\n${credentials.baseUrl}/login/reset/${String(uid)}` +

                 `\nThe above link will expire within 24 hours. After that ` +
                 `time, please request a new key to update your password.`;

    const html = `<p>${text.split('\n').join('</p><p>')}</p>`;

    return mailgun.sendEmail(
      cm.email,
      '"ClientComm - CJS" <clientcomm@codeforamerica.org>',
      'CientComm Password Reset Email',
      html
    );
  },
};

