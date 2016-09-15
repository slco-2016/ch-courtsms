'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;

// Models
const Messages = require("./messages");


// Class
class Alerts {
  
  static findByUser (userID) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("user", userID)
        .andWhere("open", true)
      .then((alerts) => {
        return fulfill(alerts);
      }).catch(reject);
    });
  }

  static closeOne (alertID) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("alert_id", alertID)
        .update({ open: false })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

}

module.exports = Alerts;