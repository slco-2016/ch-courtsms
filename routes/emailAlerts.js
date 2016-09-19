let db = require("../../../app/db");
let nodemailer = require("nodemailer");

let credentials = require("../../../credentials");
let empw = credentials.em.password;

// Create reusable transporter object using the default SMTP transport
let smtps = "smtps://clientcomm%40codeforamerica.org:" + empw + "@smtp.gmail.com";
let transporter = nodemailer.createTransport(smtps);

// Only send to junk email when in test mode
let CCENV = process.env.CCENV;
if (CCENV && CCENV == "true") {
  CCENV = true;
} else { 
  CCENV = false;
}

module.exports = {

  alertOfAccountActivation: function (email, password) {

    let text =  "Hello and welcome to ClientComm. Your temporary password is: " + password +
                "\n You can log on to your ClientComm account by going to www.clientcomm.org and, " + 
                "from the login screen, you can choose to reset your password.";

    let mailOptions = {
      from: '"ClientComm - CJS" <clientcomm@codeforamerica.org>', 
      to: CCENV ? "kuanbutts@gmail.com" : email, 
      subject: "CientComm - Welcome to ClientComm!", 
      text: text, 
      html: text 
    };

    transporter.sendMail(mailOptions, function (error, info){
      if (error) console.log(error);
    }); 

  }

}

