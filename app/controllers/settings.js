const Settings = require('../models/settings');

module.exports = {
  
  index(req, res) {
    Settings.findById(req.user.cmid)
    .then((user) => {
      res.render("settings", {
        user: user
      });
    }).catch(res.error500);
  },

  update(req, res) {
    let awayMessage = req.body.awayMessage;
    let isAway = req.body.isAway ? true : false;
    
    let alertFrequency = req.body.alertFrequency
    if (alertFrequency == "null") {
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
            awayMessage 
    ).then(() => {
      req.flash("success", "Updated your settings.");
      res.redirect("/org/users");
    }).catch(res.error500);
  }

};