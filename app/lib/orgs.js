var db = require("../app/db");
var Promise = require("bluebird");

var credentials = require("../../credentials");

module.exports = {

  new_org_param_check: function (name, from, email, expiration, allotment) {
    if (!name) {
      return {err: true, reason: "Missing name."};
    } else if (!from) {
      return {err: true, reason: "Missing or bad phone number (must be 10 or 11 digits)."};
    } else if (!email) {
      return {err: true, reason: "Missing email."};
    } else if (isNaN(Date.parse(expiration))) {
      return {err: true, reason: "Missing expiration date."};
    } else if (isNaN(Number(allotment))) {
      return {err: true, reason: "Missing allotment."};
    } else if (Number(allotment) < 1) {
      return {err: true, reason: "Allotment size too small."};
    } else {
      return {error: false, reason: ""};
    }
  },

  new_org_insert: function (name, from, email, expiration, allotment) {
    return new Promise (function (fulfill, reject) {
      db("orgs")
      .where("name", name)
      .orWhere("email", email)
      .then(function (response) {

        if (response.length == 0) {
          db("orgs").insert({
            name: name,
            email: email,
            expiration: expiration,
            allotment: allotment
          }).returning("orgid")
          .then(function (orgids) {
            console.log(orgids);
            var orgid = orgids[0];
            fulfill({reason: "Successful entry.", orgid: orgid});

          }).catch(function (err) {
            reject({reason: "Failed to create new entry."});
          });

        } else {
          reject({reason: "That name or email already exists."});
        }

      }).catch(function (err) {
        reject({reason: "Error on searching for pre-existing organizations."});
      });
    });
  },

}