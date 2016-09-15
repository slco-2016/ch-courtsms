var local = require("passport-local").Strategy;
var bcrypt = require("bcrypt-nodejs");
var db = require("./db");

// expose this function to our app using module.exports
module.exports = function (passport) {

  // bcrypt methods
  hashPw  = function(pw)       { return bcrypt.hashSync(pw, bcrypt.genSaltSync(8), null); };
  validPw = function(pw1, pw2) { return bcrypt.compareSync(pw1, pw2); };

  // user serialization
  passport.serializeUser(function (user, done) {
    done(null, user.cmid);
  });

  // user deserialization
  passport.deserializeUser(function (id, done) {
    db("cms")
    .where("cmid", id)
    .limit(1)
    .then(function (cm) {

      if (cm.constructor === Array) { cm = cm[0]; }
      done(null, cm);

    }).catch(function (err) { done(err, null); });
  });

  passport.use("local-login", new local({
      usernameField: "email",
      passwordField: "pass",
      passReqToCallback: true
    },

    function (req, email, password, done) {
      process.nextTick(function () {

        db("cms")
        .whereRaw("LOWER(email) = LOWER('" + String(email) + "')")
        .andWhere("active", true)
        .limit(1)
        .then(function (acct) {
          if (acct.constructor === Array && acct.length == 1) {
            acct = acct[0];
            if (validPw(password, acct.pass)) {

              db("cms").where("cmid", acct.cmid).limit(1)
              .update({updated: db.fn.now()})
              .then(function (success) {
                return done(null, acct);
              }).catch(function (err) { return done(err); });

            // fails because bad password
            } else { return done(null, false); }
          } else { return done(null, false); }
        }).catch(function (err) { return done(err); });
      });
    })
  );


};





