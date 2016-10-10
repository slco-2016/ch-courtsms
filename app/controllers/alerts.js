const Alerts = require('../models/alerts');
const Messages = require('../models/messages');

module.exports = {

  checkForNewMessages(req, res) {
    const userId = req.user.cmid;

    Messages.findUnreadsByUser(userId)
    .then((newMessages) => {
      res.json({ newMessages: newMessages, });
    }).catch(res.error500);
  },

  close(req, res) {
    const userId = req.user.cmid;
    const alertId = req.params.alert;

    Alerts.findById(alertId)
    .then((alert) => {
      if (alert && alert.user == userId) {
        Alerts.closeOne(alertId)
        .then(() => {
          res.json({ closed: true, });
        }).catch(res.error500);
      } else {
        res.json({ closed: false, error: 'Not allowed to edit this alert.', });
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
      orgId: orgId,
      departmentId: departmentId,
      targetUserId: targetUserId,
      scope: scope,
    });
  },

  create(req, res) {
    const orgId        = req.user.org;
    const departmentId = req.body.departmentId || null;
    const createdById  = req.user.cmid;
    const targetUserId = req.body.targetUserId || null;
    let subject      = req.body.subject || '';
    const message      = req.body.message || null;

    let redirect = '/alerts/create';
    if (res.locals.level == 'org') {
      redirect = '/org' + redirect;
    }
    if (departmentId) {
      redirect = redirect + '?department=' + departmentId;
    } else if (targetUserId) {
      redirect = redirect + '?user=' + targetUserId;
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
