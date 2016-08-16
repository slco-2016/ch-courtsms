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
class Groups {
  
  static findByUser (userID) {
    return new Promise((fulfill, reject) => {
      db("groups")
        .where("user", userID)
        .andWhere("active", true)
        .orderBy("name", "asc")
      .then((groups) => {
        fulfill(groups);
      }).catch(reject);
    });
  }
  
  static findByID (userID) {
    return new Promise((fulfill, reject) => {
      db("groups")
      .then((groups) => {
        fulfill(groups);
      }).catch(reject);
    });
  }
  
  static removeOne (groupID) {
    return new Promise((fulfill, reject) => {
      db("groups")
        .update({ active: false })
        .where("group_id", groupID)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
  static editOne (groupID, name) {
    return new Promise((fulfill, reject) => {
      db("groups")
        .update({ name: name })
        .where("group_id", groupID)
      .then((groups) => {
        fulfill(groups);
      }).catch(reject);
    });
  }
  
  static insertNew (userID, name) {
    return new Promise((fulfill, reject) => {
      db("groups")
        .insert({
          name: name,
          user: userID,
          active: true
        })
      .then((groups) => {
        fulfill(groups);
      }).catch(reject);
    });
  }

}

module.exports = Groups;