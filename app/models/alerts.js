'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");


// Models
const Messages = require("./messages");


// Class
class Alerts {
  
  static findByUser (userId) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("user", userId)
        .andWhere("open", true)
      .then((alerts) => {
        return fulfill(alerts);
      }).catch(reject);
    });
  }

  static findOne (alertId) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("alert_id", alertId)
        .andWhere("open", true)
        .limit(1)
      .then((alerts) => {
        return fulfill(alerts[0]);
      }).catch(reject);
    });
  }

  static closeOne (alertId) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("alert_id", alertId)
        .update({ open: false })
      .then(fulfill).catch(reject);
    });
  }

}

module.exports = Alerts;