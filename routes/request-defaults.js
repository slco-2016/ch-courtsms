var db = require("../app/db");

// DATETIME VARIABLES FOR EJS
var moment = require('moment');
var moment_tz = require('moment-timezone');


// New Relic Clientside monitoring
var TESTENV = process.env.TESTENV;
if (TESTENV && TESTENV == "true") {
  var newrelic = null;
} else {
  var newrelic = require('newrelic');
}


// Metadata about application
var APP_VERSION = require("../package.json").version;


module.exports = function (app) {

  app.use(function (req, res, next){
    // Load in general information specific to ClientComm session that may need to be generated
    res.locals.CLIENTCOMM_APPLICATION = {
      VERSION: APP_VERSION
    };

    res.locals.FLASH_ALERTS = {
      WARNINGS: req.flash("warning"),
      SUCCESSES: req.flash("success"),
    };

    // Flash messages
    res.locals.warning = res.locals.FLASH_ALERTS.WARNINGS;
    res.locals.success = res.locals.FLASH_ALERTS.SUCCESSES;

    // Inclusion of momentJS for datetime modifications
    res.locals.moment = moment;
    res.locals.moment_tz = moment_tz;

    // Pass New Relic as local object to invoke on render
    app.locals.newrelic = newrelic;

    // Include user if logged in
    if (req.user) { 
      res.locals.user = req.user;

      // Our default timezone will be MST because ClientComm is used in Utah
      res.locals.local_tz = "America/Denver";

      // See if we can find the organizations special timezone setting
      db.raw("SELECT * FROM orgs WHERE orgs.orgid = (SELECT cms.org FROM cms WHERE cms.cmid = 17)").then(function (org) {
        if (org && org.rows && org.rows[0]) {
          var o = org.rows[0];
          if (o.tz) res.locals.local_tz = o.tz; 
          next();

        // No results, so use default
        } else { next(); }

      // Something happened so fall back on default
      }).catch(function (err) { next(); });

    // No known org so set default timezone to MST 
    } else { next(); }
  });

}