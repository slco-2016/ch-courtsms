const db = require('../../../app/db');
const nodemailer = require('nodemailer');

const credentials = require('../../../credentials');
const empw = credentials.em.password;

// Create reusable transporter object using the default SMTP transport
const smtps = `smtps://clientcomm%40codeforamerica.org:${empw}@smtp.gmail.com`;
const transporter = nodemailer.createTransport(smtps);

// Only send to junk email when in test mode
let CCENV = process.env.CCENV;
if (CCENV && CCENV == 'true') {
  CCENV = true;
} else {
  CCENV = false;
}

module.exports = {

  alertOfAccountActivation(email, password) {
    const text = `Hello and welcome to ClientComm. Your temporary password is: ${password
                }\n You can log on to your ClientComm account by going to www.clientcomm.org and, ` +
                'from the login screen, you can choose to reset your password.';

    const mailOptions = {
      from: '"ClientComm - CJS" <clientcomm@codeforamerica.org>',
      to: CCENV ? 'kuanbutts@gmail.com' : email,
      subject: 'CientComm - Welcome to ClientComm!',
      text,
      html: text,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log(error);
    });
  },

};

