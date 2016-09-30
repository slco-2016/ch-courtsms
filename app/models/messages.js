'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");
const moment  = require("moment");


// SECRET STUFF
var credentials = require("../../credentials");
var ACCOUNT_SID = credentials.accountSid;
var AUTH_TOKEN = credentials.authToken;
var TWILIO_NUM = credentials.twilioNum;

// Twilio tools
var twilio = require("twilio");
var twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);
// Only send to junk number when in test mode
var TESTENV = true;
if (process.env.CCENV && process.env.CCENV == "production") {
  TESTENV = false;
}



// Models
const Conversations = require("./conversations");
const Communications = require("./communications");
const Clients = require("./clients");
const CommConns = require("./commConns");


// Class
class Messages {

  static findBetweenUserAndClient (userId, clientId) {
    return new Promise((fulfill, reject) => {
      Conversations.findByUser(userId)
      .then((conversations) => {
        let conversationIds = conversations.filter((conversation) => {
          return conversation.client == Number(clientId);
        }).map((conversation) => {
          return conversation.convid;
        });
        return Messages.findByConversations(conversationIds)
      }).then((messages) => {
        fulfill(messages);
      }).catch(reject);
    });
  }

  static findByConversations (conversationIds) {
    if (!Array.isArray(conversationIds)) conversationIds = [conversationIds];
    
    return new Promise((fulfill, reject) => {

      db("msgs")
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
      .then((messages) => {
        fulfill(messages)
      }).catch(reject);
    });
  }

  // To replace the above method
  static findByConversationIds (conversationIds) {
    if (!Array.isArray(conversationIds)) conversationIds = [conversationIds];
    return new Promise((fulfill, reject) => {
      db("msgs")
        .whereIn("convo", conversationIds)
      .then((messages) => {
        fulfill(messages)
      }).catch(reject);
    });
  }

  static countsByOrg (orgID, timeframe) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("date_trunc('" + timeframe + "', created) AS time_period , count(*) AS message_count"))
        .leftJoin(
          db("convos")
            .select("convos.convid", "cms.org")
            .leftJoin("cms", "cms.cmid", "convos.cm")
            .as("convos"),
          "convos.convid", "msgs.convo")
        .whereRaw("msgs.created > now() - INTERVAL '12 months'")
        .andWhere("convos.org", orgID)
        .groupBy(db.raw("1"))
        .orderBy(db.raw("1"))
      .then((counts) => {
        counts = counts.map(function (count) {
          count.time_period = moment(count.time_period).format("YYYY-MM-DD");
          return count;
        });
        fulfill(counts);
      }).catch(reject);
    });
  }

  static countsByDepartment (orgID, departmentID, timeframe) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("date_trunc('" + timeframe + "', created) AS time_period , count(*) AS message_count"))
        .leftJoin(
          db("convos")
            .select("convos.convid", "cms.org", "cms.department")
            .leftJoin("cms", "cms.cmid", "convos.cm")
            .as("convos"),
          "convos.convid", "msgs.convo")
        .whereRaw("msgs.created > now() - INTERVAL '12 months'")
        .andWhere("convos.org", orgID)
        .andWhere("convos.department", departmentID)
        .groupBy(db.raw("1"))
        .orderBy(db.raw("1"))
      .then((counts) => {
        counts = counts.map(function (count) {
          count.time_period = moment(count.time_period).format("YYYY-MM-DD");
          return count;
        });
        fulfill(counts);
      }).catch(reject);
    });
  }

  static countsByUser (orgID, userID, timeframe) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("date_trunc('" + timeframe + "', created) AS time_period , count(*) AS message_count"))
        .leftJoin(
          db("convos")
            .select("convos.convid", "cms.org", "cms.cmid")
            .leftJoin("cms", "cms.cmid", "convos.cm")
            .as("convos"),
          "convos.convid", "msgs.convo")
        .whereRaw("msgs.created > now() - INTERVAL '12 months'")
        .andWhere("convos.org", orgID)
        .andWhere("convos.cmid", userID)
        .groupBy(db.raw("1"))
        .orderBy(db.raw("1"))
      .then((counts) => {
        counts = counts.map(function (count) {
          count.time_period = moment(count.time_period).format("YYYY-MM-DD");
          return count;
        });
        fulfill(counts);
      }).catch(reject);
    });
  }

  static sendMultiple (userID, clientIDs, title, content) {
    return new Promise((fulfill, reject) => {
      clientIDs.forEach(function (clientID, i) {
        Messages.smartSend(userID, clientID, title, content)
        .then(() => {}).catch(function (err) {});
      });
      fulfill();
    });
  }

  static smartSend (userID, clientID, title, content) {
    return new Promise((fulfill, reject) => {
      Messages.getLatestNumber(userID, clientID)
      .then((commID) => {
        if (commID) {
          Messages.startNewConversation(userID, clientID, title, content, commID)
          .then(() => {
            fulfill();
          }).catch(reject);
        } else {
          // Issue: It will fail silently here.
          fulfill();
        }
      }).catch(reject);
    });
  }

  static markAsRead (messageIds) {
    if (messageIds && !Array.isArray(messageIds)) {
      messageIds = [messageIds];
    }

    return new Promise((fulfill, reject) => {
      if (messageIds.length) {
        db("msgs")
          .update({read: true})
          .whereIn("msgid", messageIds)
        .then(() => {
          fulfill()
        }).catch(reject);
      } else {
        fulfill();
      }
    });
  }

  static getLatestNumber (userID, clientID) {
    return new Promise((fulfill, reject) => {
      CommConns.getClientCommunications(clientID)
      .then((comms) => {
        if (comms.length == 1) {
          fulfill(comms[0].comm);
        } else {
          Conversations.getMostRecentConversation(userID, clientID)
          .then((conversation) => {
            if (conversation) {
              const conversationID = conversation.convid;
              Conversations.getconversationMessages(conversationID)
              .then((messages) => {
                const lastMessage = messages.pop();
                if (lastMessage) {
                  fulfill(lastMessage.comm);
                } else {
                  fulfill();
                }
              }).catch(reject);

            } else {
              fulfill();
            }
          }).catch(reject);
        }
      }).catch(reject);
    });
  }

  static findUnreadsByUser (user) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .count("msgid")
        .leftJoin("convos", "msgs.convo", "convos.convid")
        .where("msgs.read", false)
        .andWhere("convos.cm", user)
      .then(function (clients) {
        
        // See if there are any new messages in any of the conversations
        let totalNewMessages = 0;
        clients.forEach(function (ea) {
          if (!isNaN(ea.count)) {
            totalNewMessages += Number(ea.count);
          }
        });

        fulfill(totalNewMessages > 0);
      }).catch(reject);
    });
  }

  static startNewConversation (userID, clientID, subject, content, commID) {
    return new Promise((fulfill, reject) => {
      var newConvoId;

      Conversations.closeAllBetweenClientAndUser(userID, clientID)
      .then(() => {
        return Conversations.create(userID, clientID, subject, true)
      }).then((conversations) => {
        newConvoId = conversations.convid;
        return Communications.findById(commID)
      }).then((communication) => {
        Messages.sendOne(commID, content, newConvoId)
        .then(() => {
          fulfill();
        }).catch(reject);
      }).catch(reject);
    }); 
  }

  static sendOne (commId, content, conversationId) {
    return new Promise((fulfill, reject) => {
      var contentArray = content.match(/.{1,1599}/g);
      Communications.findById(commId)
      .then((communication) => {
        if (communication.type == "email") {
          // CaseManager.findById(cmid)
          //   .then((caseManager) => {
          //     return mailgun.sendEmail(
          //       this.value,
          //       caseManager.getClientCommEmail(),
          //       `New message from ${caseManager.getFullName()}`,
          //       content
          //     )
          //   }).then((response) => {

          //     console.log(response)
          //     return this._createMessage(
          //       convid,
          //       content,
          //       response.id,
          //       response.message
          //     )
          //   }).then(fulfill).catch(reject)
          // }
        } else if (communication.type == "cell") {
          contentArray.forEach(function (contentPortion, contentIndex) {
            twClient.sendMessage({
              to: TESTENV ? "+18589057365" : communication.value,
              from: TWILIO_NUM,
              body: content
            }, (err, msg) => {
              if (err) {
                reject(err)
              } else {
                const MessageSid = msg.sid;
                const MessageStatus = msg.status;
                Messages.create(conversationId, 
                                commId, 
                                contentPortion, 
                                MessageSid, 
                                MessageStatus)
                .then(() => {
                  if (contentIndex == contentArray.length - 1) fulfill();
                }).catch(reject);
              }
            })
          });          
        }
      }).catch(reject);
    });
  }

  static insertIntoManyConversations (conversationIds, commId, content, MessageSid, MessageStatus) {
    return new Promise((fulfill, reject) => {
      let insertArray = conversationIds.map((conversationId) => {
        return {
          convo: conversationId,
          comm: commId,
          content: content,
          inbound: true,
          read: false,
          tw_sid: MessageSid,
          tw_status: MessageStatus
        }
      });
      db("msgs")
        .insert(insertArray)
        .returning("*")
      .then((messages) => {
        fulfill(messages);
      }).catch(reject)
    });
  }

  static create (conversationId, commId, content, MessageSid, MessageStatus) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .insert({
          convo: conversationId,
          comm: commId,
          content: content,
          inbound: false,
          read: true,
          tw_sid: MessageSid,
          tw_status: MessageStatus
        })
        .returning("*")
      .then((messages) => {
        fulfill(messages);
      }).catch(reject)
    })
  }

  static findAllByPlatformId(platformId) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .where("tw_sid", platformId)
        then((objects) => {
          fulfill(objects)
        }).catch(reject);
    })
  }

}

module.exports = Messages