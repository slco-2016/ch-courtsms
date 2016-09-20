var db = require("../app/db");

// DATETIME VARIABLES FOR EJS
var moment = require('moment');
var moment_tz = require('moment-timezone');


// New Relic Clientside monitoring



// Metadata about application
var APP_VERSION = require("../package.json").version;


module.exports = function (app) {

  app.use(function (req, res, next){
    // Load in general information specific to ClientComm session that may need to be generated





    // Inclusion of momentJS for datetime modifications


    // Pass New Relic as local object to invoke on render
    


  });

}