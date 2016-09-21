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
  
}

module.exports = Settings;


