'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");


const Users     = require("./users");

const colors = require("colors")


// Class
class Settings {

  static findById (user) {
    return new Promise((fulfill, reject) => {
      Users.findById(user)
      .then((user) => {
        return fulfill(user);
      }).catch(reject);
    });
  }

  static updateOne (userId, first, middle, last, email, alertFrequency, isAway, awayMessage) {
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("cmid", userId)
        .update({
          first: first,
          middle: middle,
          last: last,
          email: email,
          email_alert_frequency: alertFrequency,
          is_away: isAway,
          away_message: awayMessage,
          updated: db.fn.now()
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }
  
}

module.exports = Settings;


