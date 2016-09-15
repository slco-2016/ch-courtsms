


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
  var redirectLoc = "/cms/" + req.params.cmid + "/templates";
  
  db("templates")
  .select(db.raw("templates.*, clients.first, clients.last"))
  .leftJoin("clients", "templates.client", "clients.clid")
  
  // Either this is an active org template
  .where("org", req.user.org)
  .andWhere("casemanager", null)
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


router.get("/send/:templateID", function (req, res) {

  var errorRedirect = fivehundred(res); 

  var cmid = req.params.cmid;
  var templateID = req.params.templateID;

  db("templates")
  .where("template_id", templateID)
  .limit(1)
  .then(function (templates) {

    // Make sure that there is indeed a result
    if (templates.length == 0) {
      notFound(res);

    // Continue if returned one
    } else {
      db("clients")
      .where("cm", cmid)
      .andWhere("active", true)
      .then(function (clients) {
        res.render("casemanagers/templates/select_recipient", {
          clients: clients,
          template: templates[0]
        });
      }).catch(errorRedirect);
    }

  }).catch(errorRedirect);
});


router.post("/send/:templateID", function (req, res) {
  var clid = Number(req.body.client);
  var templateID = Number(req.params.templateID);
  var cmid = req.params.cmid;

  if (isNaN(clid) || isNaN(templateID)) {
    var redirectLocation = "/cms/" + cmid + "/templates";
    res.redirect(redirectLocation);
  } else {
    var redirectLocation = "/cms/" + cmid + "/templates/send/" + templateID + "/to/" + clid;
    res.redirect(redirectLocation);
  }
  
});


router.get("/send/:templateID/to/:clientID", function (req, res) {
  // Reroute
  var errorRedirect = fivehundred(res);
  
  var cmid = req.params.cmid;
  var clientID = req.params.clientID;
  var templateID = req.params.templateID;

  if (isNaN(templateID)) {
    var redirectLocation = "/cms/" + cmid + "/templates/send/" + templateID;
    res.redirect(redirectLocation);
  
  } else {

    db("templates")
    .where("template_id", templateID)
    .limit(1)
    .then(function (templates) {

      // Make sure that there is indeed a result
      if (templates.length == 0) {
        notFound(res);

      // Continue if returned one
      } else {

        db("clients")
        .where("cm", cmid)
        .andWhere("clid", clientID)
        .then(function (clients) {

          // Make sure that client with that cm actually exists
          if (clients.length == 0) { 
            notFound(res); 

          // Then proceed to gather current conversations
          } else { 
            db("comms")
            .innerJoin("commconns", "comms.commid", "commconns.comm")
            .where("commconns.client", clientID)
            .then(function (comms) {

              res.render("casemanagers/client/newconversation/createmessage", {
                template: templates[0],
                client: clients[0],
                comms: comms
              });
              
            }).catch(errorRedirect);
          }
        }).catch(errorRedirect);

      }

    }).catch(errorRedirect);
  }

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

  var title   = req.body.title;
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
      title: title,
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
      notFound(res);
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

  var title = req.body.title;
  var content = req.body.content;

  // Make sure that there is enough content
  if ((!content || content.length < 1) || (!title || title.length < 1)) {
    req.flash("warning", "Template content or title is too short.");
    res.redirect(redirectLoc + "/" + req.params.templateID + "/edit");

  // Only continue if content has length
  } else {

    var insertObj = {
      org: orgid,
      casemanager: cmid,
      client: clid,
      title: title,
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














