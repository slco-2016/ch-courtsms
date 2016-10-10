'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

const Clients = require("../models/clients");
const Departments = require("../models/departments");
const Messages = require("../models/messages");
const Users = require("../models/users");

module.exports = {

  statusCheck () {
    return new Promise ((fulfill, reject) => {
      Messages.findNotClearedMessages()
      .then((messages) => {
        fulfill(messages);
      }).catch(reject);
    });
  },

};