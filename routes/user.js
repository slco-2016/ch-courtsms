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


// ***
// NEW ROUTING UTILITIES
// ***

class NotificationsView {
  
  static show (req, res) {
    let clientId = req.params.clientId || req.params.clientID || null;
    let status = req.query.status || "pending";
    let isSent = status === "sent";
    let strategy;

    if (clientId) {
      strategy = Notifications.findByClientID(clientId, isSent)
    } else {
      strategy = Notifications.findByUser(req.user.cmid, isSent);
    }
    
    strategy.then((n) => {
      res.render("notifications/index", {
        hub: {
          tab: "notifications",
          sel: status
        },
        notifications: n
      });
    }).catch(error500(res));
  }

  static remove (req, res) {
    let clientID = req.params.clientID;
    Notifications.removeOne(req.params.notificationID)
    .then(() => {
      req.flash("success", "Removed notification.");
      if (clientID) toRedirect = res.redirect(`/clients/${clientID}/notifications`);
      else          toRedirect = res.redirect(`/notifications`);
    }).catch(error500(res));
  }

  static editGet (req, res) {
    var clients;
    Clients.findAllByUser(req.user.cmid)
    .then((c) => {
      clients = c;

      return Notifications.findByID(Number(req.params.notificationID))
    }).then((n) => {
      if (n) {
        // Remove all closed clients except for if matches with notification
        clients = clients.filter((c) => { return c.active || c.clid === n.client; });

        res.render("notifications/edit", {
          notification: n,
          clients: clients
        });

      } else {
        notFound(res);
      }
    }).catch(error500(res));
  }

  static editPost (req, res) {
    let notificationID = req.params.notificationID;
    let clientID       = req.body.clientID;
    let commID         = req.body.commID ? req.body.commID : null;
    let subject        = req.body.subject;
    let message        = req.body.message;
    let send           = moment(req.body.sendDate)
                          .tz(res.locals.local_tz)
                          .add(Number(req.body.sendHour) - 1, "hours")
                          .format("YYYY-MM-DD HH:mm:ss");

    Notifications.editOne(
                    notificationID, 
                    clientID, 
                    commID, 
                    send, 
                    subject, 
                    message
    ).then(() => {
      req.flash("success", "Edited notification.");
      if (req.params.clientID) {
        res.redirect(`/clients/${clientID}/notifications`);
      } else {
        res.redirect(`/notifications`);
      }
    }).catch(error500(res));
  }

}














router.get("/clients/:clientId/communications", (req, res) => {
  CommConns.getClientCommunications(req.params.clientId)
  .then((c) => {
    if (c.length == 0) {
      res.redirect(`/clients/${req.params.clientId}/communications/create`);
    } else {
      res.render("clients/communications", {
        hub: {
          tab: "contactMethods",
          sel: null
        },
        communications: c
      });
    }
  }).catch(error500(res));
});

router.get("/clients/:clientId/communications/create", (req, res) => {
  res.render("clients/commConn")
});

router.post("/clients/:clientId/communications/create", (req, res) => {
  let clientId = req.params.clientId;
  let name     = req.body.description;
  let type     = req.body.type;
  let value    = req.body.value;

  // clean up numbers
  if (type == "cell" || type == "landline") {
    value = value.replace(/[^0-9.]/g, "");
    if (value.length == 10) { value = "1" + value; }
  }

  CommConns.createOne(clientId, type, name, value)
  .then(() => {
    logClientActivity(clientId);
    req.flash("success", "Created new communication method.");
    res.redirect(`/clients/${clientId}/communications`);
  }).catch(error500(res));
});

router.get("/clients/:clientID/communications/:communicationID/remove", (req, res) => {
  let clientID = req.params.clientID;
  CommConns.findByClientID(clientID)
  .then((commConns) => {
    if (commConns.length > 1) {
      Communications.removeOne(req.params.communicationID)
      .then(() => {
        req.flash("success", "Removed communication method.");
        res.redirect(`/clients/${clientID}/communications`);
      }).catch(error500(res));

    } else {
      req.flash("warning", "Can't remove the only remaining communication method.");
      res.redirect(`/clients/${clientID}/communications`);
    }
  })
});

router.get("/clients/:clientID/notifications", NotificationsView.show);

router.get("/clients/:clientID/notifications/:notificationID/remove", NotificationsView.remove);

router.get("/clients/:clientID/notifications/:notificationID/edit", NotificationsView.editGet);

router.post("/clients/:clientID/notifications/:notificationID/edit", NotificationsView.editPost);

router.post("/clients/:clientID/notifications/:notificationID/edit", NotificationsView.editPost);









module.exports = router;


