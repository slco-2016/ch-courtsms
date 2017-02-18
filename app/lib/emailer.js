const colors = require('colors');

// Secret stuff
const credentials = require('../../credentials');
const mailgun = require('./mailgun');

// Only send to junk email when in development environment
const CCENV = process.env.CCENV || 'development';

module.exports = {

  activationAlert(email, password) {
    const text = `Hello and welcome to ClientComm. Your temporary password is: ${password
                }\n You can log on to your ClientComm account by going to www.clientcomm.org and, ` +
                'from the login screen, you can choose to reset your password.';

    if (CCENV === 'production') {
      return mailgun.sendEmail(
        CCENV === 'development' ? 'clientcomm@codeforamerica.org' : email,
        '"ClientComm - CJS" <clientcomm@codeforamerica.org>',
        'ClientComm - Welcome to ClientComm!',
        html
      );
    } else {
      console.log(`\tActivation alert email would have been sent to ${email}.`);
    }
  },

};

