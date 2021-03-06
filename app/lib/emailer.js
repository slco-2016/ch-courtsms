const colors = require('colors');

// Secret stuff
const credentials = require('../../credentials');
const mailgun = require('./mailgun');

// Only send to junk email when in development environment
const CCENV = process.env.CCENV || 'development';

module.exports = {
  activationAlert(email, password) {
    const text = `Hello and welcome to ClientComm. `+
                 `Your temporary password is: ${password}` +

                 `\nYou can log on to your ClientComm account by going to: ` +
                 `${credentials.baseUrl}/login` +

                 `\nWe recommend that you set your own password immediately ` +
                 `by entering your email address in the form here: ` +
                 `${credentials.baseUrl}/login/reset`;

    const html = `<p>${text.split('\n').join('</p><p>')}</p>`;

    if (CCENV === 'production') {
      return mailgun.sendEmail(
        email,
        '"ClientComm - CJS" <clientcomm@codeforamerica.org>',
        'ClientComm - Welcome to ClientComm!',
        html
      );
    } else {
      console.log(`\tActivation alert email would have been sent to ${email}.`);
    }
  },

};

