'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");



// Class
class Conversations {

  static findByUser (userID) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("cm", userID)
        .orderBy("updated", "desc")
      .then((conversations) => {
        fulfill(conversations);
      }).catch(reject);
    })
  }
  
  static findByUserAndClient (userID, clientID) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("cm", userID)
        .andWhere("client", clientID)
        .orderBy("updated", "desc")
      .then((conversations) => {
        fulfill(conversations);
      }).catch(reject);
    })
  }

  static closeAllForClient (userID, clientID) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("client", clientID)
        .andWhere("cm", userID)
        .andWhere("open", true)
        .update({ open: false })
      .then(function () {
        fulfill();
      }).catch(reject);
    })
  }

  static getMostRecentConversation (userID, clientID) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("cm", userID)
        .andWhere("client", clientID)
        .orderBy("updated", "desc")
        .limit(1)
      .then((convos) => {
        fulfill(convos[0]);
      }).catch(reject);
    }); 
  }

  static getconversationMessages (conversationID) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .where("convo", conversationID)
        .orderBy("created", "asc")
      .then((messages) => {
        fulfill(messages);
      }).catch(reject);
    });
  }

  static transferUserReference (client, fromUser, toUser) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("cm", fromUser)
        .andWhere("client", client)
        .update("cm", toUser)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static create(userID, clientID, subject, open) {
    if (!open) open = true;
    return new Promise((fulfill, reject) => {
      db("convos")
        .insert({
          cm: userID,
          client: clientID,
          subject: subject,
          open: open,
          accepted: true,
        })
        .returning("convid")
      .then((convoIDs) => {
        fulfill(convoIDs[0]);
      }).catch(reject)
    })
  }

  static logActivity (conversationID) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("convid", conversationID)
        .update({ updated: db.fn.now() })
      .then(function () {
        fulfill();
      }).catch(reject);
    });
  }
}

module.exports = Conversations