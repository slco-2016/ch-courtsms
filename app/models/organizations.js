'use strict';

// Libraries
const db      = require('../../app/db');
const Promise = require('bluebird');

// Models
const Messages = require('./messages');


// Class
class Organizations {
  
  static findByID (orgID) {
    return new Promise((fulfill, reject) => {
      db('orgs')
        .where('orgid', orgID)
        .limit(1)
      .then((orgs) => {
        return fulfill(orgs[0]);
      }).catch(reject);
    });
  }

}

module.exports = Organizations;