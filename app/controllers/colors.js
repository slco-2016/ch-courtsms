const ColorTags = require('../models/colorTags')

module.exports = {
  index(req, res) {
    ColorTags.selectAllByUser(req.user.cmid)
    .then((colors) => {
      res.render("colors", {
        colors: colors,
      });
    }).catch(res.error500);
  }
  update(req, res) {
    ColorTags.addNewColorTag(req.user.cmid, req.body.color, req.body.name)
    .then(() => {
      req.flash("success", "New color tag created.");
      res.redirect("/colors");
    }).catch(res.error500);
  }
  destroy(req, res) {
    ColorTags.removeColorTag(req.params.colorID)
    .then(() => {
      req.flash("success", "Color tag removed.");
      res.redirect("/colors");
    }).catch(res.error500);
  }
}