const Notifications = require('../models/notifications');
const Clients = require('../models/clients');
const Templates = require('../models/templates');
const analyticsService = require('../lib/analytics-service');
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
        clients = clients.filter(client => client.clid == Number(preSelect));
      }

      res.render('notifications/create', {
        clients: clients,
        preSelect: preSelect,
        csrfToken: req.csrfToken()
      });
    }).catch(res.error500);
  },

  compose(req, res) {
    res.render('notifications/compose', {
      parameters: req.query,
      csrfToken: req.csrfToken(),
    });
  },

  composeCreate(req, res) {
    res.render('notifications/compose', {
      parameters: req.body,
      csrfToken: req.csrfToken(),
    });
  },

  templates(req, res) {
    const user = req.getUser();

    Templates.findByUser(user)
    .then((templates) => {
      res.render('notifications/templates', {
        templates: templates,
        parameters: req.query,
        csrfToken: req.csrfToken(),
      });
    }).catch(res.error500);
  },

  create(req, res) {
    const userId = req.getUser();
    const clientId = req.body.clientID;
    const commId = req.body.commID === '' ? null : req.body.commID;
    const subject = !req.body.subject ? '' : req.body.subject;
    const message = req.body.message;
    const templateUse = req.body.templateid ? true : false;
    const send = moment(req.body.sendDate)
      .startOf('day')
      .add(Number(req.body.sendHour), 'hours')
      .add(6, 'hours') // temp hack to ensure MST (TODO: Fix this!!)
      // .tz(res.locals.organization.tz)
      .format('YYYY-MM-DD HH:mm:ss');

    Promise.all([
      Clients.findById(clientId),
      Notifications.create(userId, clientId, commId, subject, message, send),
    ])
      .then(([client, notification]) => {

        analyticsService.track(null, 'notification_create', req, res.locals, {
          ccc_id: clientId,
          ccc_active: client.active,
          template_use: templateUse,
          notification: true,
          notification_id: notification.notificationid,
          notification_subject_length: subject.length,
          notification_message_length: message.length,
          notification_date_scheduled: send,
        });

        // log the use of a template if it exists
        if (templateUse) {
          Templates.logUse(req.body.templateid, userId, clientId)
            .then()
            .catch();
        }

        req.flash('success', 'Created new notification.');
        res.redirect('/notifications');
      })
      .catch(res.error500);
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
        clients = clients.filter(c => c.active || c.clid === n.client);

        res.render('notifications/edit', {
          notification: n,
          clients: clients,
          csrfToken: req.csrfToken(),
        });
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  update(req, res) {
    const notification = req.params.notification;
    const client = req.params.client;
    const comm = req.body.commID ? req.body.commID : null;
    const subject = req.body.subject;
    const message = req.body.message;
    const send = moment(new Date(req.body.sendDate))
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
        clients = clients.filter(client => client.clid == Number(preSelect));
      }

      res.render('notifications/voice', {
        clients,
        preSelect,
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
