const Settings = require('../models/settings');
const Clients = require('../models/clients');

module.exports = {
  
  index(req, res) {
    let user;
    let clientNotifications = {on: 0, off: 0, };

    Settings.findById(req.user.cmid)
    .then((resp) => {
      user = resp;
      return Clients.findManyByAttribute({cm: user.cmid, });
    }).then((clients) => {
      clients.forEach((client) => {
        if (client.allow_automated_notifications) {
          clientNotifications.on += 1;
        } else {
          clientNotifications.off += 1;
        }
      });

      res.render('settings', {
        user: user,
        clientNotifications: clientNotifications,
      });
    }).catch(res.error500);
  },

  update(req, res) {
    const awayMessage = req.body.awayMessage;
    const alertBeep = req.body.alertBeep ? true : false;
    const isAway = req.body.isAway ? true : false;
    
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
        const notify = toggleAutoNotify == 'all' ? true : false;

        return Clients.findManyByAttribute({cm: req.user.cmid, })
        .then(function (clients) {
          return new Promise((fulfill, reject) => {
            fulfill(clients);
          });
        }).map((client) => {
          return client.update({allow_automated_notifications: notify, });
        }).catch(function (err) {
          return err;
        });

      } else {
        return null;
      }
    }).then((resp) => {
      req.flash('success', 'Updated your settings.');
      res.redirect('/org/users');
    }).catch(res.error500);
  },

};