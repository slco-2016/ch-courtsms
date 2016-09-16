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











router.get("/org/clients/:clientId/alter/:status", (req, res) => {
  let clientId = req.params.clientId;
  let status = req.params.status == "open";
  Client.alterCase(clientId, status)
  .then(() => {
    logClientActivity(clientId);
    req.flash("success", "Client case status changed.")
    res.redirect(`/org/clients`);
  }).catch(res.error500);
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
  }).catch(res.error500);
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
  }).catch(res.error500);
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
      }).catch(res.error500);

    } else {
      notFound(res);
    }
  }).catch(res.error500);
});


module.exports = router;


