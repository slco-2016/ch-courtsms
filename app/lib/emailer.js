const nodemailer = require("nodemailer");
const colors = require("colors");

// Secret stuff
const credentials = require("../../credentials");
const empw = credentials.em.password;

// Only send to junk email when in development environment
let CCENV = process.env.CCENV || "development";

// Create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport(`smtps://clientcomm%40codeforamerica.org:${empw}@smtp.gmail.com`);

module.exports = {

  activationAlert: function (email, password) {

    let text =  "Hello and welcome to ClientComm. Your temporary password is: " + password +
                "\n You can log on to your ClientComm account by going to www.clientcomm.org and, " + 
                "from the login screen, you can choose to reset your password.";

    let mailOptions = {
      from: '"ClientComm - CJS" <clientcomm@codeforamerica.org>', 
      to: CCENV === "development" ? "clientcomm@codeforamerica.org" : email, 
      subject: "CientComm - Welcome to ClientComm!", 
      text: text, 
      html: text 
    };

    if (CCENV == "production") {
      transporter.sendMail(mailOptions, function (error, info){
        if (error) console.log(error);
      }); 
    } else {
      console.log(`Activation alert email would have been sent to ${email}.`);
    }

  }

}

