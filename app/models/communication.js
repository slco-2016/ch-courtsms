'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;


// TO DOS
// Check if arrays are indeed arrays and that they have length > 0


// Class
class Communication {
  static findById(id) {
    return new Promise((fulfill, reject) => {
      console.log("Warning! Communication class deprecated use Communications instead.")
      db("comms")
      .where("commid", id)
      .limit(1)
      .then(function (comms) {
        if (comms.length > 0) {
          fulfill(comms[0])
        } else {
          fulfill()
        }
      })
      .catch(reject)      
    })
  }
}

module.exports = Communication