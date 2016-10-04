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

  createForDepartment(req, res) {
    res.send("ok")
  }

};
