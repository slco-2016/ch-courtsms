const db = require('../db');
const uuid = require('uuid/v1');

const pass = require('../lib/pass');
const emUtil = require('../lib/em-notify');
const analyticsService = require('../lib/analytics-service');
const hashPw = pass.hashPw;
const isLoggedIn = pass.isLoggedIn;

function _redirectOrRenderByClass(req, res) {
  if (req.hasOwnProperty('user')) {
    if (['owner', 'supervisor',].indexOf(req.user.class) > -1) {
      res.redirect('/org/users');
    } else if (req.user.class === 'support') {
      res.redirect('/org/captured');
    } else {
      res.redirect('/clients');
    }
  } else {
    res.render('access/login', { csrfToken: req.csrfToken(), });
  }
}

module.exports = {
  login(req, res) {
    analyticsService.track(null, 'login_view', req, res.locals);
    _redirectOrRenderByClass(req, res);
  },

  loginSuccess(req, res) {
    analyticsService.track(null, 'login_success', req, res.locals);
    _redirectOrRenderByClass(req, res);
  },

  loginFail(req, res) {
    req.flash('warning', 'Email password combination did not work.');
    res.redirect('access/login-fail');
  },

  logout(req, res) {
    req.logout();
    req.flash('success', 'Successfully logged out.');
    res.redirect('/');
  },

  reset(req, res) {
    res.render('access/loginreset', { csrfToken: req.csrfToken(), });
  },

  resetSubmit(req, res) {
    const em = req.body.email;

    // See if this email is even in the system
    db('cms')
    .whereRaw(`LOWER(??) = LOWER(?)`, ['email', em])
    .limit(1)
    .then((cms) => {
      // This email is not in the system, they need to try again
      if (cms.length == 0) {
        req.flash('warning', 'Could not find an account with that email.');
        res.redirect('/login/reset');

      // There is an account with this email in the system
      } else {
        const cm = cms[0];
        const uid = uuid();

        // Remove all prior requests for password reset
        db('pwresets')
        .where('cmid', cm.cmid)
        .del()
        .then(() =>

        // Create a new row with current pw request
           db('pwresets')
          .insert({
            cmid: cm.cmid,
            uid,
            email: cm.email,
          })).then(() => {
            emUtil.sendPassResetEmail(cm, uid)
              .then(() => {
                // Render direction to check email card
                req.flash('success', `Reset password email was sent to ${cm.email}`);
                res.render('access/loginresetsent', { cm: cm, csrfToken: req.csrfToken(), });
              })
              .catch((err) => {
                console.error('Error sending password reset email: ', err);
                res.error500();
              });
          }).catch(res.error500); // Query 3
      }
    }).catch(res.error500); // Query 1
  },

  resetSpecific(req, res) {
    db('pwresets')
      .where('uid', req.params.uid)
      .andWhere('expiration', '>', db.fn.now())
      .limit(1)
    .then((rows) => {
      if (rows.length == 0) {
        req.flash('warning', 'That address does not point to a valid password reset link. Try again.');
        res.redirect('/login/reset');
      } else {
        const reset = rows[0];
        res.render('access/loginresetphasetwo', { reset: reset, csrfToken: req.csrfToken(), });
      }
    }).catch(res.error500);
  },

  resetSpecficSubmit(req, res) {
    const retry_loc = `/login/reset/${req.params.uid}`;
    const redirect_loc = '/login/reset/';

    // Critical body elements
    const pwresid = Number(req.body.pwresid);
    const cmid = Number(req.body.cmid);

    const uid = String(req.body.uid);
    const uid2 = String(req.params.uid);

    const pass = String(req.body.pass);
    const pass2 = String(req.body.pass2);


    // Make sure that passwords line up
    if (pass !== pass2) {
      req.flash('warning', 'Passwords do not match, please try again.');
      res.redirect(retry_loc);

    // Make sure key form components line up
    } else if (uid !== uid2) {
      req.flash('warning', 'Bad form entry (uid), please try applying for a new reset key.');
      res.redirect(redirect_loc);
    } else {
      // Make sure that is a valid uid being provided
      db('pwresets')
        .where('uid', uid)
        .andWhere('cmid', cmid)
        .andWhere('pwresid', pwresid)
        .andWhere('expiration', '>', db.fn.now())
        .limit(1)
        .returning('email')
      .then((rows) => {
        // Form entry is bad, they did include correct hidden components
        if (rows.length == 0) {
          req.flash('warning', 'Bad form entry, please try applying for a new reset key.');
          res.redirect(redirect_loc);

        // Found the relevant row
        } else {
          // Query 2: Update the case manager's password
          db('cms')
          .where('cmid', cmid)
          .update({ pass: hashPw(pass) })
          .then((rows) => {
          // Query 3: We can delete that pw reset row now
            db('pwresets')
          .where('pwresid', pwresid)
          .del()
          .then(() => {
            // Prompt the case manager to log in with new pw
            req.flash('success', 'You have updated your account password.');
            res.redirect('/login');
          }).catch(res.error500); // Query 3
          }).catch(res.error500); // Query 2
        }
      }).catch(res.error500);
    }
  },

};
