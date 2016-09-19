'use strict';

// (Sub) router
const express         = require("express");
const router          = express.Router({mergeParams: true});

// Models
const modelsImport   = require("../models/models");
const Alerts         = modelsImport.Alerts;
const Client         = modelsImport.Client;
const Clients        = modelsImport.Clients;
const ColorTags      = modelsImport.ColorTags;
const Communication  = modelsImport.Communication;
const Communications = modelsImport.Communications;
const CommConns      = modelsImport.CommConns;
const Convo          = modelsImport.Convo;
const Conversations  = modelsImport.Conversations;
const Departments    = modelsImport.Departments;
const Groups         = modelsImport.Groups;
const Message        = modelsImport.Message;
const Messages       = modelsImport.Messages;
const Notifications  = modelsImport.Notifications;
const Organizations  = modelsImport.Organizations;
const Templates      = modelsImport.Templates;
const Users          = modelsImport.Users;


// Twilio library tools and secrets
const credentials     = require("../credentials");
const ACCOUNT_SID     = credentials.accountSid;
const AUTH_TOKEN      = credentials.authToken;
const twilio          = require("twilio");
const twilioClient    = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);


// Outside library requires
var moment    = require("moment");
var moment_tz = require("moment-timezone");


// General error handling
const errorHandling = require("./errorHandling");
const error500     = errorHandling.error500;
const notFound      = errorHandling.notFound;

// Internal utilities
var logging                 = require("./logging");
var logClientActivity       = logging.logClientActivity;
var logConversationActivity = logging.logConversationActivity;


router.use((req, res, next) => {
  res.locals.level = "user"
  next();
})

// Standard checks for every role, no matter
// Add flash alerts
router.use((req, res, next) => {
  Alerts.findByUser(req.user.cmid)
  .then((alerts) => {
    res.locals.ALERTS_FEED = alerts;
    next();
  }).catch(error500(res));
});

// Add organization
router.use((req, res, next) => {
  Organizations.findByID(req.user.org)
  .then((org) => {
    res.locals.organization = org;
    next();
  }).catch(error500(res));
});

// Add department
router.use((req, res, next) => {
  Departments.findByID(req.user.department)
  .then((department) => {
    // if no department, provide some dummy attributes
    if (!department) {
      department = {
        name:         "Unassigned",
        phone_number: null,
        organization: req.user.org
      }
    }
    res.locals.department = department;
    next();
  }).catch(error500(res));
});






























module.exports = router;


