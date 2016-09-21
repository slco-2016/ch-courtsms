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

};