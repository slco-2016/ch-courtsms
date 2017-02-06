const Settings = require('../models/settings');
const Clients = require('../models/clients');

module.exports = {

  index(req, res) {
    let user;
    const clientNotifications = { on: 0, off: 0 };

    Settings.findById(req.user.cmid)
    .then((resp) => {
      user = resp;
      return Clients.findManyByAttribute('cm', user.cmid);
    }).then((clients) => {
      clients.forEach((client) => {
        if (client.allow_automated_notifications) {
          clientNotifications.on += 1;
        } else {
          clientNotifications.off += 1;
        }
      });

      res.render('settings', {
        user,
        clientNotifications,
      });
    }).catch(res.error500);
  },

  update(req, res) {
    const awayMessage = req.body.awayMessage;
    const alertBeep = !!req.body.alertBeep;
    const isAway = !!req.body.isAway;

    let alertFrequency = req.body.alertFrequency;
    if (alertFrequency == 'null') {
      alertFrequency = null;
    } else if (isNaN(alertFrequency)) {
      alertFrequency = 24;
    }

    Settings.updateOne(
            req.user.cmid,
            req.body.first,
            req.body.middle,
            req.body.last,
            req.body.email,
            alertFrequency,
            isAway,
            awayMessage,
            alertBeep
    ).then(() => {
      // map through all the clients and update their statuses if that is asked of the tool
      const toggleAutoNotify = req.body.toggleAutoNotify;
      if (toggleAutoNotify == 'all' || toggleAutoNotify == 'none') {
        const notify = toggleAutoNotify == 'all';

        return Clients.findManyByAttribute('cm', req.user.cmid)
        .then(clients => new Promise((fulfill, reject) => {
          fulfill(clients);
        })).map(client => client.update({ allow_automated_notifications: notify })).catch(err => err);
      }
      return null;
    }).then((resp) => {
      req.flash('success', 'Updated your settings.');
      res.redirect('/org/users');
    }).catch(res.error500);
  },

};
