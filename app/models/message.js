'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");


// TO DOS
// Check if arrays are indeed arrays and that they have length > 0


// Class
class Message {
  static create(messageObject) {
    console.log("Warning! Deprecated. Use Messages class from now on.")
    return new Promise((fulfill, reject) => {
      db("msgs")
      .insert(messageObject).returning("msgid")
      .then((messageIds) => {
        fulfill(messageIds[0])
      }).catch(reject)
    })
  }
}

module.exports = Message