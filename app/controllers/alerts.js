const Alerts = require('../models/alerts');
const Messages = require('../models/messages');

module.exports = {

  checkForNewMessages(req, res) {
    let userId = req.user.cmid;

    Messages.findUnreadsByUser(userId)
    .then((newMessages) => {
      res.json({ newMessages: newMessages });
    }).catch(res.error500);
  },

  close(req, res) {
    let userId = req.user.cmid;
    let alertId = req.params.alert;

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
    let orgId = req.user.org;
    let departmentId = req.query.department || null;
    let targetUserId = req.query.user || null;
    
    let scope = "organization";
    if (departmentId) { scope = "department"; }
    if (targetUserId) { scope = "organization"; }

    res.render("alerts/create", {
      orgId: orgId,
      departmentId: departmentId,
      targetUserId: targetUserId,
      scope: scope
    });
  },

  create(req, res) {
    let orgId        = req.user.org;
    let departmentId = req.body.departmentId || null;
    let createdById  = req.user.cmid;
    let targetUserId = req.body.targetUserId || null;
    let subject      = req.body.subject;
    let message      = req.body.message || null;

    let redirect = "/org";
    if (departmentId) {
      redirect = redirect + "/departments";
    } else {
      redirect = redirect + "/users";
    }

    console.log("\n\n\n")
    console.log("Method targetUserId", targetUserId)
    console.log("Method departmentId", departmentId)
    console.log("\n\n\n")
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
        req.flash("success", "Alert(s) sent out.");
        res.redirect(redirect);
      }).catch(res.error500)
    } else {
      req.flash("warning", "Message subject needs to be at least 1 character long.");
      res.redirect(redirect);
    }
  },

};
