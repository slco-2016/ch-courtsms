

// Libraries
const db = require('../../app/db');
const Promise = require('bluebird');


const Users = require('./users');

const colors = require('colors');


// Class
class Settings {

  static findById(user) {
    return new Promise((fulfill, reject) => {
      Users.findById(user)
      .then(user => fulfill(user)).catch(reject);
    });
  }

  static updateOne(userId, first, middle, last, email, alertFrequency, isAway, awayMessage, alertBeep) {
    return new Promise((fulfill, reject) => {
      db('cms')
        .where('cmid', userId)
        .update({
          first,
          middle,
          last,
          email,
          email_alert_frequency: alertFrequency,
          is_away: isAway,
          away_message: awayMessage,
          alert_beep: alertBeep,
          updated: db.fn.now(),
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

}

module.exports = Settings;

