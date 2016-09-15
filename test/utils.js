


// DEPENDENCIES
var db = require("../app/db");
var assert = require("chai").assert;
var creds = require("../credentials");



module.exports = {
  
  superuserLogin: function (req, cb) {
    req.post("/login")
      .field("email", creds.db.user)
      .field("pass", creds.db.password)
      .expect(302, cb);
  },

  createOrganization: function (req, cb) {
    req.post("/orgs")
      .field("name", "Example Organization")
      .field("phone", "18008008000")
      .field("email", "fooorg@foo.com")
      .field("expiration", "2020-01-01")
      .field("allotment", "10000")
      .expect(302, cb);
  },

  createSupervisor: function (req, cb) {
    req.post("/orgs/1")
      .field("orgid", "1")
      .field("first", "Jim")
      .field("middle", "M")
      .field("last", "Surie")
      .field("email", "jim@foo.com")
      .field("password", "123")
      .field("position", "Supervisor")
      .field("department", "Pretrial")
      .field("admin", "true")
      .expect(302, cb);
  },

  testuserLogin: function (req, cb) {
    req.post("/login")
      .field("email", "jim@foo.com")
      .field("pass", "123")
      .expect(302, cb);
  },

  logout: function (req, cb) {
      req.get("/logout")
        .expect(302, cb);
  }

};