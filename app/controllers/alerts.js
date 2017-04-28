const Alerts = require('../models/alerts');
const Messages = require('../models/messages');
const Clients = require('../models/clients');

module.exports = {

  checkForNewMessages(req, res) {
    const userId = req.user.cmid;
    const showActiveClients = req.query.status !== 'archived';
    let departmentID = req.user.department || req.query.department;
    const user = req.body.targetUser || req.user.cmid;
    const limitByUser = req.query.user || null;

    // Don't limit by department if the user's support or an owner
    if ((req.user.class == 'owner' || req.user.class == 'support') &&
          !req.query.department) {
      departmentID = null;
    }

    let method;
    if (res.locals.level == 'user') {
      method = Clients.findByUsers(user, showActiveClients);
    } else if (departmentID) {
      method = Clients.findManyByDepartmentAndStatus(departmentID, showActiveClients);
    } else {
      method = Clients.findByOrg(req.user.org, showActiveClients);
    }

    method.then((clients) => {
      if (limitByUser) {
        clients = clients.filter(client => Number(client.cm) === Number(limitByUser));
      }
      Messages.findUnreadsByUser(userId)
      .then((newMessages) => {
        res.json({ 'newMessages':newMessages, 'clients': clients });
      }).catch(res.error500);
    });
  },

  close(req, res) {
    const userId = req.user.cmid;
    const alertId = req.params.alert;

    Alerts.findById(alertId)
    .then((alert) => {
      if (alert && alert.user == userId) {
        Alerts.closeOne(alertId)
        .then(() => {
          res.json({ closed: true });
        }).catch(res.error500);
      } else {
        res.json({ closed: false, error: 'Not allowed to edit this alert.' });
      }
    }).catch(res.error500);
  },

  new(req, res) {
    const orgId = req.user.org;
    const departmentId = req.query.department || null;
    const targetUserId = req.query.user || null;

    let scope = 'organization';
    if (departmentId) { scope = 'department'; }
    if (targetUserId) { scope = 'organization'; }

    res.render('alerts/create', {
      orgId,
      departmentId,
      targetUserId,
      scope,
    });
  },

  create(req, res) {
    const orgId = req.user.org;
    const departmentId = req.body.departmentId || null;
    const createdById = req.user.cmid;
    const targetUserId = req.body.targetUserId || null;
    let subject = req.body.subject || '';
    const message = req.body.message || null;

    let redirect = '/alerts/create';
    if (res.locals.level == 'org') {
      redirect = `/org${redirect}`;
    }
    if (departmentId) {
      redirect = `${redirect}?department=${departmentId}`;
    } else if (targetUserId) {
      redirect = `${redirect}?user=${targetUserId}`;
    }

    subject = subject.trim();
    if (subject.length) {
      let strategy;
      if (targetUserId) {
        strategy = Alerts.createForUser(targetUserId, createdById, subject, message);
      } else if (departmentId) {
        strategy = Alerts.createForDepartment(departmentId, createdById, subject, message);
      } else {
        strategy = Alerts.createForOrganization(organizationId, createdById, subject, message);
      }
      strategy.then(() => {
        req.flash('success', 'Alert(s) sent out.');
        res.redirect(redirect);
      }).catch(res.error500);
    } else {
      req.flash('warning', 'Message subject needs to be at least 1 character long.');
      res.redirect(redirect);
    }
  },

};
