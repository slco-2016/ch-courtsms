const Messages = require('../models/messages');

module.exports = {

  checkForNew(req, res) {
    let userId = req.user.cmid;

    Messages.findUnreadsByUser(userId)
    .then((newMessages) => {
      res.json({ newMessages: newMessages });
    }).catch(res.error500);
  },

};
