var db = require("../app/db");

// FOR EJS DATETIME
var moment = require("moment");
var moment_tz = require("moment-timezone");

module.exports = function () {
  var email = credentials.db.user;
  var password = credentials.db.password;

  db("cms")
  .where("email", email)
  .limit(1)
  .then(function (cms) {

    // superuser exists
    if (cms.length > 0) {
      cms = cms[0];
      console.log("Superuser already exists. (Created on " + JSON.stringify(cms.created) + ".)");

    // need to create the superuser
    } else {
      db("cms").insert({
        org: null,
        first: "SUPER",
        middle: null,
        last: "USER",
        email: email,
        pass: pass.hashPw(password),
        position: null,
        department: null,
        admin: true,
        active: true,
        superuser: true,
      }).then(function (success) {
        console.log("Created default superuser.");
      }).catch(function () {
        console.log("Failed to create default superuser: " + String(err));
      });
    }

  }).catch(function (err) {
    console.log("Failed to query for default superuser: " + String(err));
  })
}