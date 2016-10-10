const db = require('../app/db');
const nodemailer = require('nodemailer');

const credentials = require('../../credentials');
const empw = credentials.em.password;

// Create reusable transporter object using the default SMTP transport
const smtps = 'smtps://clientcomm%40codeforamerica.org:' + empw + '@smtp.gmail.com';
const transporter = nodemailer.createTransport(smtps);

module.exports = {
  runEmailUpdates: function () {
    const rawQuery =  ' SELECT count(msgid), MAX(msgs.created) AS made, cms.cmid, cms.first, cms.last, cms.email ' +
                    ' FROM msgs ' + 
                    ' LEFT JOIN (SELECT convos.convid, convos.cm FROM convos) AS convos ON (convos.convid = msgs.convo) ' +
                    ' LEFT JOIN (SELECT cms.cmid, cms.first, cms.last, cms.email FROM cms) AS cms ON (cms.cmid = convos.cm) ' + 
                    ' WHERE msgs.read = FALSE AND msgs.created > CURRENT_TIMESTAMP - INTERVAL \'1 day\' ' +
                    ' AND msgs.created < CURRENT_TIMESTAMP ' +
                    ' GROUP BY cms.cmid, cms.first, cms.last, cms.email ORDER BY made DESC; ';

    db.raw(rawQuery).then(function (msgs) {
      msgs.rows.forEach(function (msg, i) {

        const text =  ' Hello, ' + msg.first + ' ' + msg.last + ', this is Kuan from Code for America. ' + 
                    ' You are receiving this automated email because you have ' + msg.count + ' message(s) waiting for you in ClientComm that is more than 4 hours old. ' +
                    ' To view this message go to ClientComm.org and login with your user name and password. ' +
                    ' If you are having issues accessing your account, send me an email at kuan@codeforamerica.org and I will be happy to assist you any time, day or night!'; 

        const mailOptions = {
          from: '"ClientComm - CJS" <clientcomm@codeforamerica.org>', 
          to: msg.email, 
          subject: 'Alert: New Unread ClientComm Messages!', 
          text: text, 
          html: text, 
        };

        // Send mail with defined transport object
        transporter.sendMail (mailOptions, function(error, info){
          if (error) { console.log(error); } 
          else { console.log('Message sent: ' + info.response); }

          if (i == msgs.length - 1) { setTimeout(function () { console.log('COMPLETED EMAIL NOTIFICATIONS.'); }, 2000); }
        }); 
      });

      if (msgs.rows.length == 0) { setTimeout(function () { console.log('COMPLETED EMAIL NOTIFICATIONS (and there were no new notifications).'); }, 2000); }

    }).catch(function (err) { 
      console.log(err); 
    });

  }, 

  notifyUserFailedSend: function (cm, msg) {
    const text = '  Hi, ' + cm.first + '. You are recieving this email because a message you wrote failed to send. ' +
                ' This was not your fault - it was likely an error with the SMS service provider. ' + 
                
                ' \n <b> What was the message? </b> ' +
                ' The contents of the message are included below: \n ' +
                ' "' + msg.content + '"' + 
                
                ' \n <b> More details: </b> ' +
                ' The message was sent at ' + msg.created + '. ' +
                ' It\'s last known status was: ' + msg.tw_status + 
                
                ' \n <b> What should I do? </b> ' +
                ' Please check the message and send it again, if needed. ' + 
                ' \n Thanks much and apologies for the inconvenience, ' + cm.email + 
                ' Kuan and Code for America, Team Salt Lake County';

    const html = '<p>' + text.split('\n').join('</p><p>') + '</p>';

    const mailOptions = {
      from: '"ClientComm - CJS" <clientcomm@codeforamerica.org>', 
      to: cm.email, 
      subject: 'Alert: Error sending message from ClientComm!', 
      text: text, 
      html: html, 
    };

    transporter.sendMail(mailOptions, function (error, info){
      if (error) console.log(error);
    }); 
  },

  sendPassResetEmail: function (cm, uid, cb) {

    const text = '  Hello, ' + cm.first + ' ' + cm.last + '. You are recieving this email because your account (' + cm.email + ') has requested a password reset. ' +
                ' \n If this was not you, you don\'t need to do anything. If it was you and you did intend to reset your password, please go to the ' + 
                ' following address by either clicking on or cutting and pasting the following address: ' + 
                ' \n https://clientcomm.org/login/reset/' + String(uid) + 
                ' \n The above link will expire within 24 hours. After that time, please request a new key to update your password. ';

    const html = '<p>' + text.split('\n').join('</p><p>') + '</p>';

    const mailOptions = {
      from: '"ClientComm - CJS" <clientcomm@codeforamerica.org>', 
      to: cm.email, 
      subject: 'CientComm Password Reset Email', 
      text: text, 
      html: html, 
    };

    transporter.sendMail(mailOptions, function (error, info){
      if (error) console.log(error);
      cb();
    }); 

  },
};



