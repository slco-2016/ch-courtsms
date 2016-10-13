const Alerts = require('../models/alerts');
const Messages = require('../models/messages');

module.exports = {

  index(req, res) {
    res.render('help/index');
  },

};
