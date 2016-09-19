'use strict';


// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router({mergeParams: true});

// DB via knex.js to run queries
var db  = require("../../app/db");

// UTILITIES
var utils = require("../../utils/utils.js");

// Datetime management
var moment = require("moment");
var moment_tz = require("moment-timezone");

// Error handling
var errorHandlers = utils["errorHandlers"];
var fivehundred   = errorHandlers.fivehundred;


// TEMPLATES BOARD OVERVIEW
router.get("/", function (req, res) {
  const cmid = req.params.cmid;
  res.redirect("/" + cmid + "/groups/newmessage")
});


// SHOW CARD FOR CREATING A NEW TEMPLATE
router.get("/newmessage", function (req, res) {


});



// EXPORT ROUTER OBJECt
module.exports = router;



// UTILITY FUNCIONS














