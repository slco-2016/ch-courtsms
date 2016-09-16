const Notifications = require('../models/notifications');
const Clients = require('../models/clients');
const Templates = require('../models/templates');

module.exports = {
  index(req, res) {
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
    }).catch(res.error500);
  },
  new(req, res) {
    Clients.findByUser(req.user.cmid)
    .then((clients) => {
      res.render("notifications/create", {
        clients: clients
      })
    }).catch(res.error500);
  },
  compose(req, res) {
    res.render("notifications/compose", {
      parameters: req.query
    });
  },
  composeCreate(req, res) {
    res.render("notifications/compose", {
      parameters: req.body
    });
  },
  templates(req, res) {
    Templates.findByUser(req.user.cmid)
    .then((templates) => {
      res.render("notifications/templates", {
        templates: templates,
        parameters: req.query
      });
    }).catch(res.error500);
  },
  create(req, res) {
    let userID   = req.user.cmid;
    let clientID = req.body.clientID;
    let commID   = req.body.commID == "" ? null : req.body.commID;
    let subject  = !req.body.subject ? "" : req.body.subject;
    let message  = req.body.message;
    let send     = moment(req.body.sendDate)
                    .tz(res.locals.local_tz)
                    .add(Number(req.body.sendHour) - 1, "hours")
                    .format("YYYY-MM-DD HH:mm:ss");

    Notifications.create(
                    userID, 
                    clientID, 
                    commID, 
                    subject, 
                    message, 
                    send
    ).then(() => {
      req.flash("success", "Created new notification.");
      res.redirect(`/notifications`);
    }).catch(res.error500);
  },
  edit(req, res) {
    var clients;
    Clients.findAllByUser(req.user.cmid)
    .then((c) => {
      clients = c;

      return Notifications.findByID(Number(req.params.notification))
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
    }).catch(res.error500);
  },
  update(req, res) {
    let notificationId = req.params.notification;
    let clientID       = req.body.clientID;
    let commID         = req.body.commID ? req.body.commID : null;
    let subject        = req.body.subject;
    let message        = req.body.message;
    let send           = moment(req.body.sendDate)
                          .tz(res.locals.local_tz)
                          .add(Number(req.body.sendHour) - 1, "hours")
                          .format("YYYY-MM-DD HH:mm:ss");

    Notifications.editOne(
                    notificationId, 
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
    }).catch(res.error500);
  },
  destroy(req, res) {
    let clientID = req.params.clientID;
    Notifications.removeOne(req.params.notification)
    .then(() => {
      req.flash("success", "Removed notification.");
      if (clientID) toRedirect = res.redirect(`/clients/${clientID}/notifications`);
      else          toRedirect = res.redirect(`/notifications`);
    }).catch(res.error500);
  },
}