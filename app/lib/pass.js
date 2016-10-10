// DEPENDENCIES
const bcrypt = require('bcrypt-nodejs');
const credentials = require('../../credentials');

module.exports = {

  isLoggedIn: function (req, res, next) {
    const realsuper = req.isAuthenticated() && req.user.hasOwnProperty('superuser') && req.user.superuser;
    if (req.isAuthenticated() || realsuper) { 
      return next(); 
    } else { 
      req.flash('warning', 'Please log in for access.');
      res.redirect('/login'); 
    }
  },

  checkIsAllowed: function(req, res, next) {
    let allowed = true;

    const client = res.locals.client;
    const user = res.locals.user;
    const level = res.locals.level;
    const organization = res.locals.organization;
    const department = res.locals.department;

    if (level == 'org') {
      if (user.class == 'primary') {
        allowed = false;
      }

      // this would never fire, i dont think because department id from user.department
      if (user.class == 'supervisor') {
        if (department.department_id !== user.department) {
          allowed = false;
        }
      }
    }

    if (client) {
      if (client.cm !== user.cmid) {

        if (client.department.org && client.department.org !== user.org) {
          allowed = false;
        }

        if (client.department.department_id !== user.department) {
          if (['owner', 'support', 'developer',].indexOf(user.class) < 0) {
            allowed = false;
          }
        }

      }
    }

    if (allowed) {
      return next();
    } else {
      res.redirect('/login');
    }
  },

  isAdmin: function (req, res, next) {
    const realadmin = req.isAuthenticated() && req.user.active && req.user.admin;
    const realsuper = req.isAuthenticated() && req.user.hasOwnProperty('superuser') && req.user.superuser;
    if (realadmin || realsuper) { 
      return next(); 
    } else { 
      req.flash('warning', 'Sorry you cannot view this page because you do not have Admin access.');
      res.redirect('/401'); 
    }
  },

  isSuper: function (req, res, next) {
    const realsuper = req.isAuthenticated() && req.user.hasOwnProperty('superuser') && req.user.superuser;
    if (realsuper) { 
      return next(); 
    } else { 
      req.flash('warning', 'No access allowed, you do not have SUPERUSER access.');
      res.redirect('/401'); 
    }
  },

  hashPw: function (pw) {
    return bcrypt.hashSync(pw, bcrypt.genSaltSync(8), null); 
  },

  validPw: function (pw1, pw2) {
    return bcrypt.compareSync(pw1, pw2); 
  },
};