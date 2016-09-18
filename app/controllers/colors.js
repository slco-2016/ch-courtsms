const ColorTags = require('../models/colorTags')
const Client = require('../models/client');

module.exports = {

  index(req, res) {
    ColorTags.selectAllByUser(req.user.cmid)
    .then((colors) => {
      res.render("colors", {
        colors: colors,
      });
    }).catch(res.error500);
  },
  
  update(req, res) {
    ColorTags.addNewColorTag(req.user.cmid, req.body.color, req.body.name)
    .then(() => {
      req.flash("success", "New color tag created.");
      res.redirect("/colors");
    }).catch(res.error500);
  },

  select(req, res) {
    ColorTags.selectAllByUser(req.user.cmid)
    .then((colors) => {
      if (colors.length > 0) {
        res.render("clients/colors", {
          colors: colors,
          params: req.params
        });
      } else {
        res.redirect(`/colors`);
      }
    }).catch(res.error500);
  },

  attribute(req, res) {
    let colorID = req.body.colorID == "" ? null : req.body.colorID;
    Client.udpateColorTag(req.params.client, colorID)
    .then(() => {
      req.logActivity.client(req.params.client);
      req.flash("success", "Changed client color.");
      res.redirect(`/clients`);
    }).catch(res.error500);
  },

  destroy(req, res) {
    ColorTags.removeColorTag(req.params.color)
    .then(() => {
      req.flash("success", "Color tag removed.");
      res.redirect("/colors");
    }).catch(res.error500);
  }

};