const Notifications = require('../models/notifications');
const Clients = require('../models/clients');
const Templates = require('../models/templates');

let moment = require("moment");
let moment_tz = require("moment-timezone");

module.exports = {
  index(req, res) {
    let client = req.params.client || req.params.clientId || req.params.clientID || null;
    let status = req.query.status || "pending";
    let isSent = status === "sent";
    let strategy;

    if (client) {
      strategy = Notifications.findByClientID(client, isSent)
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
    let user = req.getUser();
    if (req.query.user) {
      if (!isNaN(req.query.user)) {
        user = req.query.user;
      }
    }

    let org = req.user.org;
    let department = req.user.department;
    let preSelect = req.query.client || null;

    Clients.findByUser(user, true)
    .then((clients) => {
      if (preSelect) {
        clients = clients.filter((client) => {
          return client.clid == Number(preSelect);
        });
      }

      res.render("notifications/create", {
        clients: clients,
        preSelect: preSelect
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
    let user = req.getUser();

    Templates.findByUser(user)
    .then((templates) => {
      res.render("notifications/templates", {
        templates: templates,
        parameters: req.query
      });
    }).catch(res.error500);
  },

  create(req, res) {
    let user     = req.getUser();
    let client   = req.body.clientID;
    let comm     = req.body.commID == "" ? null : req.body.commID;
    let subject  = !req.body.subject ? "" : req.body.subject;
    let message  = req.body.message;
    let send     = moment(req.body.sendDate)
                    .tz(res.locals.organization.tz)
                    .startOf("day")
                    .add(Number(req.body.sendHour), "hours")
                    .format("YYYY-MM-DD HH:mm:ss");

    Notifications.create(
                    user, 
                    client, 
                    comm, 
                    subject, 
                    message, 
                    send
    ).then(() => {
      req.flash("success", "Created new notification.");
      res.redirect(`/notifications`);
    }).catch(res.error500);
  },

  edit(req, res) {
    let clients;
    let user = req.getUser();
    let notification = req.params.notification;

    Clients.findAllByUsers([user])
    .then((c) => {
      clients = c;
      return Notifications.findByID(Number(notification))
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
    let notification   = req.params.notification;
    let client         = req.params.client;
    let comm           = req.body.commID ? req.body.commID : null;
    let subject        = req.body.subject;
    let message        = req.body.message;
    let send           = moment(new Date(req.body.sendDate))
                          .add(12, "hours")
                          .tz(res.locals.organization.tz)
                          .startOf("day")
                          .add(Number(req.body.sendHour), "hours")
                          .utc()
                          .format("YYYY-MM-DD HH:mm:ss");

    Notifications.editOne(
                    notification, 
                    client, 
                    comm, 
                    send, 
                    subject, 
                    message
    ).then((notification) => {
      req.flash("success", "Edited notification.");
      res.redirect(`/clients/${notification.client}/notifications`);
    }).catch(res.error500);
  },

  remove(req, res) {
    let notification = req.params.notification;

    Notifications.removeOne(notification)
    .then((notification) => {
      req.flash("success", "Removed notification.");
      res.redirect(`/clients/${notification.client}/notifications`);

    }).catch(res.error500);
  }
}