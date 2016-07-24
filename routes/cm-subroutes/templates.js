


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
router.post("/create", function (req, res) {
  
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";

  var orgid = Number(req.user.org);
  var cmid =  Number(req.user.cmid);

  var clid = Number(req.body.client);
  if (isNaN(clid)) {
    clid = null;
  }

  var content = req.body.content;

  // Make sure that there is enough content
  if (!content || content.length < 1) {
    req.flash("warning", "Template content is too short.");
    res.redirect(redirectLoc + "/create");

  // Only continue if content has length
  } else {

    var insertObj = {
      org: orgid,
      casemanager: cmid,
      client: clid,
      content: content
    };

    // Run insert of new template
    db("templates")
    .insert(insertObj)
    .then(function (success) {
      res.redirect(redirectLoc);
    }).catch(errorRedirect);

  }
});


// EDIT VIEW FOR A SINGLE TEMPLATE
router.get("/:templateID/edit", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";

  // Paramters to variables
  var templateID = req.params.templateID;
  var cmid =  Number(req.user.cmid);
  
  db("templates")
  .select(db.raw("templates.*, clients.first, clients.last"))
  .leftJoin("clients", "templates.client", "clients.clid")
  .where("casemanager", req.user.cmid)
  .andWhere("template_id", templateID)
  .then(function (templates) {

    if (templates.length == 0) {
      res.redirect("/404");
    } else {

      db("clients")
      .where("cm", cmid)
      .andWhere("active", true)
      .then(function (clients) {

        res.render("casemanagers/templates/template_edit_card", {
          template: templates[0],
          clients: clients
        });
      }).catch(errorRedirect);
    }

  }).catch(errorRedirect);
});


// MODIFY A TEMPLATE ROW SUBMISSION
router.post("/:templateID/edit", function (req, res) {
  
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";

  var orgid = Number(req.user.org);
  var cmid =  Number(req.user.cmid);
  var templateID = req.params.templateID;

  var clid = Number(req.body.client);
  if (isNaN(clid)) {
    clid = null;
  }

  var content = req.body.content;

  // Make sure that there is enough content
  if (!content || content.length < 1) {
    req.flash("warning", "Template content is too short.");
    res.redirect(redirectLoc + "/" + req.params.templateID + "/edit");

  // Only continue if content has length
  } else {

    var insertObj = {
      org: orgid,
      casemanager: cmid,
      client: clid,
      content: content,
      updated: db.fn.now()
    };

    // Run insert of modified template
    db("templates")
    .where("casemanager", req.user.cmid)
    .andWhere("template_id", templateID)
    .update(insertObj)
    .then(function (success) {
      res.redirect(redirectLoc);
    }).catch(errorRedirect);
  }
});


// DELETE A TEMPLATE ROW 
router.post("/:templateID/delete", function (req, res) {
  
  var errorRedirect = fivehundred(res); 
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";

  var orgid = Number(req.user.org);
  var cmid =  Number(req.user.cmid);
  var templateID = req.params.templateID;

  var clid = Number(req.body.client);
  if (isNaN(clid)) {
    clid = null;
  }

  // Run insert of modified template
  db("templates")
  .where("casemanager", req.user.cmid)
  .andWhere("template_id", templateID)
  .update({ active: false })
  .then(function (success) {

    req.flash("success", "Removed a custom template.");
    res.redirect(redirectLoc);

  }).catch(errorRedirect);

});



// EXPORT ROUTER OBJECt
module.exports = router;



// UTILITY FUNCIONS














