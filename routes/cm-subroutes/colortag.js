


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
  
  // Reroute
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid;

  var cmid = Number(req.user.cmid);
  var clid = Number(req.params.clid);

  
  db("clients")
  .where("clid", clid)
  .andWhere("cm", cmid)
  .limit(1)
  .then(function (clients) {

    // Only show card if there is a client returned
    if (clients.length > 0) {
      res.render("casemanagers/client/color_tag_select", {
        client: clients[0]
      });

    // Otherwise 404
    } else {
      notFound(res);
    }

  }).catch(errorRedirect);

});


// SUMIT CHAGED COLOR
router.post("/", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid;

  var cmid = Number(req.user.cmid);
  var clid = Number(req.params.clid);

  
  db("clients")
  .where("clid", clid)
  .andWhere("cm", cmid)
  .update({
    color_tag: req.body.colorTagValue
  })
  .then(function (success) {

    req.flash("success", "Updated client color.");
    res.redirect(redirectLoc);

  }).catch(errorRedirect);

});


// EXPORT ROUTER OBJECt
module.exports = router;



// UTILITY FUNCIONS














