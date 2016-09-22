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

    Settings.updateOne(
            req.user.cmid, 
            req.body.first, 
            req.body.middle, 
            req.body.last, 
            req.body.email,
            isAway,
            awayMessage 
    ).then(() => {
      req.flash("success", "Updated your settings.");
      res.redirect("/org/users");
    }).catch(res.error500);
  }

};