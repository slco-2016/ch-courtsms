


// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router({mergeParams: true});

// DB via knex.js to run queries
var db  = require("../../server/db");

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
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";
  
  db("templates")
  .select(db.raw("templates.*, clients.first, clients.last"))
  .leftJoin("clients", "templates.client", "clients.clid")
  
  // Either this is an active org template
  .where("org", req.user.org)
  .andWhere("templates.active", true)
  
  // ... or an active case manager template
  .orWhere("casemanager", req.user.cmid)
  .andWhere("templates.active", true)
  
  .orderByRaw("casemanager ASC, updated DESC")
  .then(function (templates) {

    res.render("casemanagers/templates/templates", {
      templates: templates
    });

  }).catch(errorRedirect);
});


// SHOW CARD FOR CREATING A NEW TEMPLATE
router.get("/create", function (req, res) {
  
  var errorRedirect = fivehundred(res); 
  var cmid = Number(req.user.cmid);

  db("clients")
  .where("cm", cmid)
  .andWhere("active", true)
  .then(function (clients) {
    res.render("casemanagers/templates/template_create_card", {
      clients: clients
    });
  }).catch(errorRedirect);

});


// POST NEW TEMPLATE DATA INTO DB
router.get("/", function (req, res) {
  
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";

  res.send("foo");
  
});



// EXPORT ROUTER OBJECt
module.exports = router;



// UTILITY FUNCIONS














