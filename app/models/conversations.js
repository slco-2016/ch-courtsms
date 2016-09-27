'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel

// Class
class Conversations extends BaseModel {

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
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }

  static findOrCreate (clients, commId, from) {
    if (!Array.isArray(clients)) clients = [clients];
    return new Promise((fulfill, reject) => {

      let clientIds = clients.map((client) => {
        return client.clid;
      });

      let getConversationIds;
      if (!clients.length) {
        // If there are are no potential clients, 
        // seek out existing uncaptured conversations
        getConversationIds = db("msgs")
          .leftJoin("convos", "convos.convid", "msgs.convo")
          .where("msgs.comm", commId)
          .andWhere("convos.client", null)
          .andWhere("convos.open", true);
      } else {
        getConversationIds = db("convos")
          .whereIn("client", clientIds)
          .andWhere("open", true);
      }

      getConversationIds.then((conversations) => {
        if (conversations.length) {
          fulfill(conversations);
          return null;
        } else {
          // Check if there is an unlinked conversation 
          // associated with this value
          return db.select("convos.convid").from("comms")
            .innerJoin("msgs", "comms.commid", "msgs.comm")
            .innerJoin("convos", "msgs.convo", "convos.convid")
            .where("convos.open", true)
            .andWhere("comms.value", from)
            .andWhere("convos.cm", null)
            .andWhere("convos.client", null)
            .groupBy("convos.convid");
        }
      }).then((conversations) => {
        if (conversations.length) {
          fulfill(conversations);
          return null;
        } else {
          // Make a new conversation(s)
          var insertList = [];

          for (var i = 0; i < clients.length; i++) {
            var client = clients[i];
            var insertObj = {
              cm:       client.cmid,
              client:   client.clid,
              subject:  "Automatically created conversation",
              open:     true,
              accepted: false // leave the conversations "not accepted"
            }
            insertList.push(insertObj);
          }

          return db("convos")
            .insert(insertList)
            .returning("*");
        }
      }).then(function (conversations) {
        fulfill(convos);
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
      .then((conversations) => {
        fulfill(conversations[0]);
      }).catch(reject)
    })
  }

  static logActivity (conversationID) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("convid", conversationID)
        .update({ updated: db.fn.now() })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
}

module.exports = Conversations