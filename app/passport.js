const local = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const db = require('./db');

// expose this function to our app using module.exports
module.exports = function (passport) {
  // bcrypt methods
  hashPw = function (pw) { return bcrypt.hashSync(pw, bcrypt.genSaltSync(8), null); };
  validPw = function (pw1, pw2) { return bcrypt.compareSync(pw1, pw2); };

  // user serialization
  passport.serializeUser((user, done) => {
    done(null, user.cmid);
  });

  // user deserialization
  passport.deserializeUser((id, done) => {
    db('cms')
    .where('cmid', id)
    .limit(1)
    .then((user) => {
      if (user.constructor === Array) {
        user = user[0];
      }
      done(null, user);
    }).catch((err) => {
      done(err, false);
    });
  });

  passport.use('local-login', new local({
    usernameField: 'email',
    passwordField: 'pass',
    passReqToCallback: true,
  },

    (req, email, password, done) => {
      process.nextTick(() => {
        db('cms')
        .whereRaw(`LOWER(email) = LOWER('${String(email)}')`)
        .andWhere('active', true)
        .limit(1)
        .then((acct) => {
          if (acct.constructor === Array && acct.length == 1) {
            acct = acct[0];
            if (validPw(password, acct.pass)) {
              db('cms').where('cmid', acct.cmid).limit(1)
              .update({ updated: db.fn.now() })
              .then(success => done(null, acct)).catch(err => done(err));

            // fails because bad password
            } else { return done(null, false); }
          } else { return done(null, false); }
        }).catch(err => done(err));
      });
    }),
  );
};

