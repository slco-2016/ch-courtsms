'use strict';

// Libraries
const db      = require("../../server/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;


// TO DOS
// Check if arrays are indeed arrays and that they have length > 0


// Class
class Notifications {
  
  static findByUser (userID, sent) {
    if (typeof sent == "undefined") sent = false;

    return new Promise((fulfill, reject) => {
      db("notifications")
        .leftJoin(
          db("clients")
            .select(db.raw("first, middle, last, clid"))
            .as("clients"),
          "clients.clid", "notifications.client")
        .where("cm", userID)
        .andWhere("sent", sent)
        .andWhere("closed", false)
        .orderBy("send", "asc")
      .then((notifications) => {
        fulfill(notifications)
      }).catch(reject);
    })
  }

  static findByID (notificationID) {
    return new Promise((fulfill, reject) => {
    })
  }

  static removeOne (notificationID) {
    return new Promise((fulfill, reject) => {
      db("notifications")
        .update({ closed: true })
        .where("notificationid", notificationID)
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static editOne (notificationID) {
    return new Promise((fulfill, reject) => {
    })
  }

  static insertNew () {
    return new Promise((fulfill, reject) => {
    })
  }

}

module.exports = Notifications