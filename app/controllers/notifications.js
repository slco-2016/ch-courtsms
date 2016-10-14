const Notifications = require('../models/notifications');
const Clients = require('../models/clients');
const Templates = require('../models/templates');

const moment = require('moment');
const momentTz = require('moment-timezone');

module.exports = {
  index(req, res) {
    const client = req.params.client || req.params.clientId || req.params.clientID || null;
    const status = req.query.status || 'pending';
    const isSent = status === 'sent';
    let strategy;

    if (client) {
      strategy = Notifications.findByClientID(client, isSent);
    } else {
      strategy = Notifications.findByUser(req.user.cmid, isSent);
    }
    
    strategy.then((n) => {
      res.render('notifications/index', {
        hub: {
          tab: 'notifications',
          sel: status,
        },
        notifications: n,
      });
    }).catch(res.error500);
  },

  new(req, res) {
    let preSelect = req.query.client || null;
    if (isNaN(preSelect)) preSelect = null;
    let user = req.getUser();
    if (req.query.user) {
      if (!isNaN(req.query.user) && req.user.class !== 'primary') {
        user = req.query.user;
      }
    }

    Clients.findByUser(user, true)
    .then((clients) => {
      if (preSelect) {
        clients = clients.filter((client) => {
          return client.clid == Number(preSelect);
        });
      }

      res.render('notifications/create', {
        clients: clients,
        preSelect: preSelect,
      });
    }).catch(res.error500);
  },

  compose(req, res) {
    res.render('notifications/compose', {
      parameters: req.query,
    });
  },

  composeCreate(req, res) {
    res.render('notifications/compose', {
      parameters: req.body,
    });
  },

  templates(req, res) {
    const user = req.getUser();

    Templates.findByUser(user)
    .then((templates) => {
      res.render('notifications/templates', {
        templates: templates,
        parameters: req.query,
      });
    }).catch(res.error500);
  },

  create(req, res) {
    const user     = req.getUser();
    const client   = req.body.clientID;
    const comm     = req.body.commID == '' ? null : req.body.commID;
    const subject  = !req.body.subject ? '' : req.body.subject;
    const message  = req.body.message;
    const send     = moment(req.body.sendDate)
                    .startOf('day')
                    .add(Number(req.body.sendHour), 'hours')
                    .add(6, 'hours') // temp hack to ensure MST (TODO: Fix this!!)
                    // .tz(res.locals.organization.tz)
                    .format('YYYY-MM-DD HH:mm:ss');

    Notifications.create(
                    user, 
                    client, 
                    comm, 
                    subject, 
                    message, 
                    send
    ).then(() => {
      req.flash('success', 'Created new notification.');
      res.redirect('/notifications');
    }).catch(res.error500);
  },

  edit(req, res) {
    let clients;
    const user = req.getUser();
    const notification = req.params.notification;

    Clients.findAllByUsers([user,])
    .then((c) => {
      clients = c;
      return Notifications.findByID(Number(notification));
    }).then((n) => {
      if (n) {
        // Remove all closed clients except for if matches with notification
        clients = clients.filter((c) => { return c.active || c.clid === n.client; });

        res.render('notifications/edit', {
          notification: n,
          clients: clients,
        });

      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  update(req, res) {
    const notification   = req.params.notification;
    const client         = req.params.client;
    const comm           = req.body.commID ? req.body.commID : null;
    const subject        = req.body.subject;
    const message        = req.body.message;
    const send           = moment(new Date(req.body.sendDate))
                          .add(12, 'hours')
                          .tz(res.locals.organization.tz)
                          .startOf('day')
                          .add(Number(req.body.sendHour), 'hours')
                          .utc()
                          .format('YYYY-MM-DD HH:mm:ss');

    Notifications.editOne(
                    notification, 
                    client, 
                    comm, 
                    send, 
                    subject, 
                    message
    ).then((notification) => {
      req.flash('success', 'Edited notification.');
      res.redirect('/notifications');
    }).catch(res.error500);
  },

  voiceRedirector(req, res) {
    let preSelect = req.query.client || null;
    if (isNaN(preSelect)) preSelect = null;
    let user = req.getUser();
    if (req.query.user) {
      if (!isNaN(req.query.user) && req.user.class !== 'primary') {
        user = req.query.user;
      }
    }

    Clients.findByUser(user, true)
    .then((clients) => {
      if (preSelect) {
        clients = clients.filter((client) => {
          return client.clid == Number(preSelect);
        });
      }

      res.render('notifications/voice', {
        clients: clients,
        preSelect: preSelect,
      });
    }).catch(res.error500);
  },

  remove(req, res) {
    const notification = req.params.notification;

    Notifications.removeOne(notification)
    .then((notification) => {
      req.flash('success', 'Removed notification.');
      res.redirect(`/clients/${notification.client}/notifications`);

    }).catch(res.error500);
  },
};