const app = require('./app')

// START UP CLIENTCOMM
var port = 4000;
var server = app.listen(port, function () {
  console.log(`Listening on port ${port}.`.green);

  // Run super user check (after migrations)
  // TO DO: This method is hacky, there should be a callback at migrations completion
  setTimeout(function () { require("../utils/superuser-check.js")(); }, 5000);
});


// EXPORT SERVER
module.exports = server;


// SCHEDULER
// TO DO: Make anything here a CRON job
//        Get rid of need for these arbitrary env vars
// Process environment indicator
var EMNOTIF = process.env.EMNOTIF;

// EMNOTIF means run email notifications, including regular check up on text messages
if (EMNOTIF && EMNOTIF == "true") {
  var dailyTimer = 1000 * 60 * 60 * 24;
  var fifteenMinTimer = 1000 * 60 * 15; 
  var thirtySecTimer = 1000 * 60 * 0.5; 

  // Set activities
  setInterval(function () { require("../utils/em-notify").runEmailUpdates(); }, dailyTimer); 
  setInterval(function () { require("../utils/sms-status-check").checkSMSstatus(); }, thirtySecTimer); 
  setInterval(function () { require("../utils/timed-notification").checkAndSendNotifications(); }, fifteenMinTimer); 
}