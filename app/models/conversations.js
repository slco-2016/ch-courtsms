'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");
const BaseModel = require("../lib/models").BaseModel


// Class
class Conversations extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        "convid",
        "cm",
        "client",
        "subject",
        "open",
        "accepted",
        "updated",
        "created"
      ]
    })
  }

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

  static findByIds (conversationIds) {
    if (!Array.isArray(conversationIds)) conversationIds = [conversationIds];
    return new Promise((fulfill, reject) => {
      let conversations;
      db("convos")
        .whereIn("convid", conversationIds)
      .then((convos) => {
        conversations = convos;
        
        // Did this because can't require Messages b/c Messages requires Conversations...
        return db("msgs")
          .select("msgs.*", 
                  "sentiment.sentiment",
                  "commconns.client",
                  "commconns.name as commconn_name", 
                  "comms.value as comm_value",
                  "comms.type as comm_type")
          .leftJoin("comms", "comms.commid", "msgs.comm")
          .leftJoin("convos", "convos.convid", "msgs.convo")
          .leftJoin("commconns", function () {
              this
                .on("commconns.comm", "msgs.comm")
                .andOn("commconns.client", "convos.client");
            })
          .leftJoin("ibm_sentiment_analysis as sentiment", "sentiment.tw_sid", "msgs.tw_sid")
          .whereIn("convo", conversationIds)
          .orderBy("created", "asc")

      }).then((messages) => {
        conversations = conversations.map((conversation) => {
          conversation.messages = [];
          messages.forEach((message) => {
            if (message.convo == conversation.convid) {
              conversation.messages.push(message);
            }
          });
          return conversation;
        });
        
        fulfill(conversations);
      }).catch(reject);
    })
  }

  static makeClaimDecision (conversationsId, userId, clientId, accepted) {
    if (typeof accepted == "undefined") {
      accepted = true;
    }
    accepted = accepted == true ? true : false;

    return new Promise((fulfill, reject) => {
      db("convos")
        .update({ open: false })
        .where("client", clientId)
        .andWhere("cm", userId)
      .then(() => {
        return db("convos")
        .update({
          cm: userId,
          client: clientId,
          open: accepted,
          accepted: accepted
        })
        .where("convid", conversationsId)
        .returning("*")
      }).then((conversations) => {
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

  static findOrCreate (clients, commId) {
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

        // See if there is a new enough conversation
        let allRecentlyActive = true;
        if (conversations.length) {
          conversations.forEach((conversation) => {
            let d1 = new Date().getTime();
            let d2 = new Date(conversation.created).getTime();
            let timeLapsed = Math.round((d2 - d1) / (3600 * 1000));

            // only allow continuation of conversations less than a day old
            if (timeLapsed < 24) {
              allRecentlyActive = false;
            }
          });
        } else {
          allRecentlyActive = false;
        }
        
        if (allRecentlyActive) {
          fulfill(conversations);
          return null;
        } else {
          // Check if there is an unlinked conversation 
          // associated with this value
          return db.select("convos.convid").from("comms")
            .innerJoin("msgs", "comms.commid", "msgs.comm")
            .innerJoin("convos", "msgs.convo", "convos.convid")
            .where("convos.open", true)
            .andWhere("comms.commid", commId)
            .and.whereNull("convos.cm")
            .and.whereNull("convos.client")
            .groupBy("convos.convid");
        }
      }).then((conversations) => {
        if (conversations.length) {
          fulfill(conversations);
          return null;
        } else if (clients.length) {
          // Make a new conversation(s)
          let insertList = [];
          let ableToAccept = clients.length == 1 ? true : false;

          for (var i = 0; i < clients.length; i++) {
            let client = clients[i];
            let insertObj = {
              cm:       client.cm,
              client:   client.clid,
              subject:  "Automatically created conversation",
              open:     true,
              accepted: ableToAccept
            }
            insertList.push(insertObj);
          }

          return db("convos")
            .insert(insertList)
            .returning("*");
        }
      }).then((conversations) => {
        console.log("conversations", conversations)
        this._getMultiResponse(conversations, fulfill);
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
        this._getSingleResponse(convos, fulfill);
      }).catch(reject);
    }); 
  }

  static getconversationMessages (conversationID) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .where("convo", conversationID)
        .orderBy("created", "asc")
      .then((messages) => {
        this._getMultiResponse(messages, fulfill);
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
    if (typeof open == "undefined") open = true;
    return new Promise((fulfill, reject) => {
      db("convos")
        .insert({
          cm: userID,
          client: clientID,
          subject: subject,
          open: open,
          accepted: true,
        })
        .returning("*")
      .then((conversations) => {
        this._getSingleResponse(conversations, fulfill);
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