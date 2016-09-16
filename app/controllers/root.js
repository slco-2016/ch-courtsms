module.exports = {

  index(req, res, next) {
    if (!req.hasOwnProperty("user")) {
      res.redirect('/login');
    } else if (["owner", "supervisor", "support"].indexOf(req.user.class) > -1) {
      res.redirect(`/org`);
    } else if (["developer", "primary"].indexOf(req.user.class) > -1) {
      res.redirect(`/clients`);
    } else {
      // TODO: Who hits this? Seems like this would never hit
      res.notFound();
    }
  }

};