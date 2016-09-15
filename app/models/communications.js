'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;

const CommConns = require("./commConns");


// Class
class Communications {

  static findById (commID) {
    return new Promise((fulfill, reject) => {
      db("comms")
        .where("commid", commID)
        .limit(1)
      .then(function (comms) {
        fulfill(comms[0])
      })
      .catch(reject);
    })
  }

  static findByValue (value) {
    return new Promise((fulfill, reject) => {
      db("comms")
        .whereRaw("LOWER(value) = LOWER('" + String(value) + "')")
        .limit(1)
      .then(function (comms) {
        fulfill(comms[0])
      })
      .catch(reject);
    })
  }

  static getUseCounts (clientID, communicationIDArray) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("count(msgid), comm"))
        .whereIn("comm", communicationIDArray)
        .groupBy("comm")
      .then((counts) => {
        fulfill(counts);
      }).catch(reject);
    }); 
  }

  static removeOne (commConnID) {
    return new Promise((fulfill, reject) => {
      db("commconns")
        .where("commconnid", commConnID)
        .update({ retired: db.fn.now() })
      .then(() => {
        fulfill();
      }).catch(reject);
    }); 
  }

  static createOne (type, description, value) {
    return new Promise((fulfill, reject) => {
      console.log("commIDs");
      db("comms")
        .insert({
          type: type,
          value: value,
          description: description
        })
        .returning("commid")
      .then((commIDs) => {
        fulfill(commIDs[0]);
      }).catch(reject);
    }); 
  }

}

module.exports = Communications