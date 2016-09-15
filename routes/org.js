'use strict';

// (Sub) router
const express         = require("express");
const router          = express.Router({mergeParams: true});


// Twilio library tools and secrets
const credentials     = require("../credentials");
const ACCOUNT_SID     = credentials.accountSid;
const AUTH_TOKEN      = credentials.authToken;
const twilio          = require("twilio");
const twilioClient    = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);


// Outside library requires
let moment    = require("moment");
let moment_tz = require("moment-timezone");


// General error handling
const errorHandling = require("./errorHandling");
const error500     = errorHandling.error500;
const notFound      = errorHandling.notFound;

// Internal utilities
let logging                 = require("./logging");
let logClientActivity       = logging.logClientActivity;
let logConversationActivity = logging.logConversationActivity;
let emailer                 = require("./emailer");

router.get("/org", (req, res) => {

});




router.get("/org/clients/create", (req, res) => {
  Users.findByOrg(req.user.org)
  .then((users) => {
    if (req.user.department) {
      users = users.filter((u) => { return u.department == req.user.department });
    }
    res.render("clients/create", {
      users: users
    });
  }).catch(error500(res));
});

router.post("/org/clients/create", (req, res) => {
  let userId = req.body.targetUser;    
  let first  = req.body.first;    
  let middle = req.body.middle ? req.body.middle : "";    
  let last   = req.body.last;   
  let dob    = req.body.DOB;    
  let so     = req.body.uniqueID1 ? req.body.uniqueID1 : null;    
  let otn    = req.body.uniqueID2 ? req.body.uniqueID2 : null;
  Client.create(
          userId, 
          first, 
          middle, 
          last, 
          dob, 
          so,  // note these should be renamed
          otn // this one as well
  ).then(() => {
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

// For all /org/clients/:clientId, include local obj. client
router.use("/org/clients/:clientId", (req, res, next) => {
  Client.findByID(req.params.clientId)
  .then((c) => {
    if (c) {
      res.locals.client = c;
      next();
    } else {
      notFound(res);
    }
  }).catch(error500(res));
});

router.get("/org/clients/:clientId", (req, res) => {
  res.send("special org view of client");
});

router.get("/org/clients/:clientId/address", (req, res) => {
  res.render("clients/address", {
    template: req.query,
  });
});

router.post("/org/clients/:clientId/address", (req, res) => {
  let userId   = res.locals.client.cm;
  let clientId = req.params.clientId;
  let subject  = req.body.subject;
  let content  = req.body.content;
  let commID   = req.body.commID == "null" ? null : req.body.commID;
  let method;

  if (commID) {
    method = Messages.startNewConversation(userId, clientId, subject, content, commID);
  } else {
    method = Messages.smartSend(userId, clientId, subject, content);
  }

  method.then(() => {
    logClientActivity(clientId);
    req.flash("success", "Message to client sent.");
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

router.get("/org/clients/:clientId/alter/:status", (req, res) => {
  let clientId = req.params.clientId;
  let status = req.params.status == "open";
  Client.alterCase(clientId, status)
  .then(() => {
    logClientActivity(clientId);
    req.flash("success", "Client case status changed.")
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

router.get("/org/clients/:clientId/edit", (req, res) => {
  res.render("clients/edit");
});

router.post("/org/clients/:clientId/edit", (req, res) => {
  let clientId  = req.params.clientId;
  let first     = req.body.first;
  let middle    = req.body.middle;
  let last      = req.body.last;
  let dob       = req.body.dob;
  let so        = req.body.uniqueID1;
  let otn       = req.body.uniqueID2;
  Client.editOne(
          clientId, 
          first, 
          middle, 
          last, 
          dob, 
          so, 
          otn
  ).then(() => {
    logClientActivity(req.params.clientId);
    req.flash("success", "Edited client.");
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

router.get("/org/clients/:clientId/transfer", (req, res) => {
  let allDep = req.query.allDepartments == "true" ? true : false;
  if (req.user.class === "owner") {
    allDep = true;
  }
  Users.findByOrg(req.user.org)
  .then((users) => {
    // Limit only to same department transfers
    if (!allDep) users = users.filter((u) => { return u.department == req.user.department });

    res.render("clients/transfer", {
      users: users,
      allDepartments: allDep
    });
  }).catch(error500(res));
});

router.post("/org/clients/:clientId/transfer", (req, res) => {
  const fromUserID = res.locals.client.cm;
  const toUserID   = req.body.userID;
  const clientId   = req.params.clientId;
  const bundleConv = req.params.bundleConversations ? true : false;

  Users.findByID(toUserID)
  .then((user) => {
    if (user && user.active) {
      Client.transfer(clientId, fromUserID, toUserID, bundleConv)
      .then(() => {
        logClientActivity(clientId);
        res.redirect(`/org/clients`);
      }).catch(error500(res));

    } else {
      notFound(res);
    }
  }).catch(error500(res));
});


module.exports = router;


