const PhoneNumbers = require('../models/phoneNumbers');

module.exports = {
  index(req, res) {
    PhoneNumbers.findByOrgID(req.user.org)
      .then(numbers => {
        res.render('phoneNumbers/index', {
          hub: {
            tab: 'numbers',
            sel: null,
          },
          numbers,
        });
      })
      .catch(res.error500);
  },

  new(req, res) {
    res.render('phoneNumbers/create');
  },
};
