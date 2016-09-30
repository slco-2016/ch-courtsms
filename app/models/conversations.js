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

  static closeAllBetweenClientAndUser (userID, clientID) {
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

  static findByClientAndUserInvolvingSpecificCommId (clients, communication) {
    // clients is an array of client objects
    // communicatiosn is an object representing a single communication row
    let clientIds = clients.map((client) => {
      return client.clid;
    });
    let userIds = clients.map((client) => {
      return client.cm;
    });
    let commId = communication.commid;
    let conversations;

    return new Promise((fulfill, reject) => {
      db("convos")
        .whereIn("client", clientIds)
        .and.whereIn("cm", userIds)
        .andWhere("open", true)
      .then((resp) => {
        conversations = resp;
        // We need to remove situations where a client was communication
        // not with their current case manager
        conversations = conversations.filter((conversation) => {
          // Find the related client
          let clientsThatAreInThisConversation = clients.filter((client) => {
            return client.clid == conversation.client;
          });
          let relatedClient = clientsThatAreInThisConversation[0];

          let conversationClient = conversation.client;
          let conversationUser = conversations.cm;
          let relatedClientCaseManager = relatedClient.cm;
          return conversationUser == relatedClientCaseManager;
        });

        // Get conversation Ids
        let conversationIds = conversations.map((conversation) => {
          return conversation.convid;
        });

        // Get messages associated with each conversation that use that commid
        return db("msgs")
          .whereIn("convo", conversationIds)
          .andWhere("comm", commId)
      }).then((messages) => {

        // get list of conversationIds from the resulting messages
        let conversationIds = messages.map((message) => {
          return message.convo;
        });

        // Filter out conversations not in conversationIds
        conversations.filter((conversation) => {
          return conversationIds.indexOf(conversation.convid) > -1;
        })

        // Final list is good to send off
        this._getMultiResponse(conversations, fulfill);
      }).catch(reject);
    });
  }

  static createNewIfOlderThanSetHours(conversations, hourThreshold) {
    if (!hourThreshold || isNaN(hourThreshold)){
      hourThreshold = 24; // default to 1 day threshold
    }

    return new Promise((fulfill, reject) => {

      return new Promise((fulfill, reject) => {
        this._getMultiResponse(conversations, fulfill);
      }).map((conversation) => {

        let d1 = new Date().getTime();
        let d2 = new Date(conversation.updated).getTime();
        let timeLapsed = Math.round((d2 - d1) / (3600 * 1000)); // in hours
        let recentlyActive = timeLapsed < Number(hourThreshold); // active conversations are less than a day olf

        if (recentlyActive) {
          fulfill(conversation);
        } else {
          let userId = conversation.cm;
          let clientId = conversation.client;
          let subject = "Automatically created";
          let open = true;
          return Conversations.create(userId, clientId, subject, open);
        };
      })

    });
  }

  static createNewNOtAcceptedConversationsForAllClients(clients) {
    return new Promise((fulfill, reject) => {
      let insertList = [];
      clients.forEach((client) => {
        insertList.push({
          cm: client.cm,
          client: client.clid,
          subject: "Automatically created",
          open: true,
          accepted: false,
        });
      });

      db("convos")
        .insert(insertList)
        .returning("*")
      .then((conversations) => {
        this._getMultiResponse(conversations, fulfill);
      }).catch(reject)
    }
  }

  // static findOrCreate (clients, commId) {
  //   if (!Array.isArray(clients)) clients = [clients];
  //   let jumpToCreateNewConversation = false;

  //   return new Promise((fulfill, reject) => {

  //     let clientIds = clients.map((client) => {
  //       return client.clid;
  //     });

  //     let getConversations;
  //     if (!clients.length) {
  //       // If there are are no potential clients, 
  //       // seek out existing uncaptured conversations
  //       getConversations = db("msgs")
  //         .leftJoin("convos", "convos.convid", "msgs.convo")
  //         .where("msgs.comm", commId)
  //         .andWhere("convos.client", null)
  //         .andWhere("convos.open", true);
  //     } else {
  //       getConversations = db("convos")
  //         .whereIn("client", clientIds)
  //         .andWhere("open", true);
  //     }

  //     getConversations.then((conversations) => {

  //       // See if there is a new enough conversation
  //       let allRecentlyActive = true;
  //       if (conversations.length) {
  //         conversations.forEach((conversation) => {
  //           let d1 = new Date().getTime();
  //           let d2 = new Date(conversation.updated).getTime();
  //           let timeLapsed = Math.round((d2 - d1) / (3600 * 1000));

  //           // only allow continuation of conversations less than a day old
  //           if (timeLapsed > 24) {
  //             allRecentlyActive = false;
  //           }
  //         });
  //       } else {
  //         allRecentlyActive = false;
  //       }
        
  //       if (allRecentlyActive) {
  //         fulfill(conversations);
  //         return null;
  //       } else if (conversations.length) {
  //         // Close out all current conversations
  //         let conversationIds = conversations.map((conversation) => {
  //           return conversation.convid;
  //         });
  //         return db("convos")
  //           .update({open: false})
  //           .whereIn("convid", conversationIds);
  //       } else {
  //         // Check if there is an unlinked conversation 
  //         // associated with this value
  //         return db.select("convos.*").from("comms")
  //           .innerJoin("msgs", "comms.commid", "msgs.comm")
  //           .innerJoin("convos", "msgs.convo", "convos.convid")
  //           .where("convos.open", true)
  //           .andWhere("comms.commid", commId)
  //           .and.whereNull("convos.cm")
  //           .and.whereNull("convos.client")
  //           .groupBy("convos.convid");
  //       }
  //     }).then((conversations) => {
  //       if (conversations && conversations.length) {
  //         fulfill(conversations);
  //         return null;
  //       } else if (clients.length) {
  //         // Make a new conversation(s)
  //         let insertList = [];
  //         let ableToAccept = clients.length == 1 ? true : false;

  //         for (var i = 0; i < clients.length; i++) {
  //           let client = clients[i];
  //           let insertObj = {
  //             cm:       client.cm,
  //             client:   client.clid,
  //             subject:  "Automatically created conversation",
  //             open:     true,
  //             accepted: ableToAccept
  //           }
  //           insertList.push(insertObj);
  //         }

  //         return db("convos")
  //           .insert(insertList)
  //           .returning("*");

  //       } else {
  //         // Unable to find any messages, add to capture board
  //         return db("convos")
  //           .insert(insertList)
  //           .returning("*");
  //       }
  //     }).then((conversations) => {
  //       fulfill(conversations, fulfill);
  //     }).catch(reject);
  //   })
  // }

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

  static create(userId, clientId, subject, open) {
    if (typeof open == "undefined") open = true;
    return new Promise((fulfill, reject) => {
      Conversations.closeAllBetweenClientAndUser(userId)
      .then(() => {
        return db("convos")
          .insert({
            cm: userId,
            client: clientId,
            subject: subject,
            open: open,
            accepted: true,
          })
          .returning("*")
      }).then((conversations) => {
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