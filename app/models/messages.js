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

const BaseModel = require("../lib/models").BaseModel
const mailgun = require("../lib/mailgun")

const Clients = require("./clients");
const CommConns = require("./commConns");
const Communications = require("./communications");
const Conversations = require("./conversations");
const Departments = require("./departments");
const PhoneNumbers = require("./phoneNumbers");
const Users = require("./users");

class Messages extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        "msgid",
        "convo",
        "comm",
        "content",
        "inbound",
        "read",
        "sent_to",
        "tw_sid",
        "tw_status",
        "email_id",
        "created",
        "status_cleared"
      ]
    })
  }

  static countsByDepartment (departmentID, timeframe) {
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

  static countsByUser (userID, timeframe) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("date_trunc('" + timeframe + "', created) AS time_period , count(*) AS message_count"))
        .leftJoin(
          db("convos")
            .select("convos.convid", "cms.org", "cms.cmid", "cms.department")
            .leftJoin("cms", "cms.cmid", "convos.cm")
            .as("convos"),
          "convos.convid", "msgs.convo")
        .whereRaw("msgs.created > now() - INTERVAL '12 months'")
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

  static determineIfAutoResponseShouldBeSent(messages) {
    return new Promise((fulfill, reject) => {
      let content, commId, conversationId;
      let baseMessage = messages[0];

      if (baseMessage) {
        commId = baseMessage.comm;
        conversationId = baseMessage.convo;

        let inboundMessages = messages.filter((message) => {
          return message.inbound;
        });
        let outboundMessages = messages.filter((message) => {
          return !message.inbound;
        });

        // This is a new conversation that has been started from unknown number
        if (conversation.client == null) {
          if (inboundMessages.length == 1) {
            content = `Sorry! This # is not registered; Help us find you. Reply with your name in the following format: FIRST M LAST.`;
          } else {
            content = `Thanks for the message. A support member will place this number with the correct case manager as soon as possible.`;
          }

        } else if (inboundMessages.length > 1) {
          let lastInboundDate = inboundMessages[inboundMessages.length - 1].created;
          let d1 = new Date(lastInboundDate).getTime();
          let d2 = new Date().getTime();
          let timeLapsed = Math.round((d2 - d1) / (3600*1000));

          // If it's been more than 1 hour let's communicate
          if (timeLapsed > 1) {
            let dayOfWeek = d2.getDay();
            if (dayOfWeek == 0 || dayOfWeek == 6) {
              content = `Message received. Because it is the weekend, your case manager may not be able to response immediately. Thanks for your patience.`;
            } else {
              content = `Message received. As it has been over ${timeLapsed} hours and your case manager has not yet addressed your prior message, a reminder has been sent out. Thanks for your patience.`;
            }
          }
        }

        fulfill({
          sendResponse: content ? true : false,
          sendValues: {
            communicationId: commId,
            conversationId: conversationId,
            content: sendValues,
          }
        });

      } else {
        fulfill({
          sendResponse: false,
          sendValues: null
        });
      }
    });
  }

  static findManyByTwSid(twSid) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .where("tw_sid", twSid)
      .then((objects) => {
        this._getMultiResponse(objects, fulfill)
      }).catch(reject);
    })
  }

  static findNotClearedMessages () {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .leftJoin("comms", "comms.commid", "msgs.comm")
        .whereNot("msgs.status_cleared", true)
        .and.whereNotNull("tw_sid")
      .then((messages) => {
        messages = messages.filter((message) => {
          let twSid = message.tw_sid;
          return twSid.startsWith("MM") || twSid.startsWith("SM");
        });
        this._getMultiResponse(messages, fulfill)
      }).catch(reject);
    })
  }

  static findBetweenUserAndClient (userId, clientId) {
    return new Promise((fulfill, reject) => {
      Conversations.findByUser(userId)
      .then((conversations) => {
        let conversationIds = conversations.filter((conversation) => {
          return conversation.client == Number(clientId);
        }).map((conversation) => {
          return conversation.convid;
        });
        return Messages.findWithSentimentAnalysisAndCommConnMetaByConversationIds(conversationIds)
      }).then((messages) => {
        fulfill(messages);
      }).catch(reject);
    });
  }

  static findByConversation (conversation) {
    let conversationId = conversation.convid;
    return new Promise((fulfill, reject) => {
      db("msgs")
        .where("convo", conversationId)
      .then((messages) => {
        this._getMultiResponse(messages, fulfill);
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

  static findWithSentimentAnalysisAndCommConnMetaByConversationIds (conversationIds) {
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

  static insertIntoManyConversations (
    conversationIds, commId, content, 
    MessageSid, MessageStatus, sentTo,
    options) {
    if (!options) {
      options = {}
    }
    if (!options.emailId) {
      options.emailId = null
    }
    if (!options.recordingId) {
      options.recordingId = null
    }
    conversationIds.forEach((conversationId) => {
      if (!conversationId) {
        throw new Error("Need a valid conversation id")
      }
    })
    return new Promise((fulfill, reject) => {
      let insertArray = conversationIds.map((conversationId) => {
        return {
          convo: conversationId,
          comm: commId,
          content: content,
          inbound: true,
          read: false,
          sent_to: sentTo,
          tw_sid: MessageSid,
          tw_status: MessageStatus,
          email_id: options.emailId,
          recording_id: options.recordingId,
        }
      });
      db("msgs")
        .insert(insertArray)
        .returning("*")
      .then((messages) => {
        this._getMultiResponse(messages, fulfill)
      }).catch(reject)
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

  static sendOne (commId, content, conversation) {
    return new Promise((fulfill, reject) => {
      var contentArray = content.match(/.{1,1599}/g);
      Communications.findById(commId)
      .then((communication) => {
        if (communication.type == "email") {

          return Users.findById(conversation.cm)
          .then((user) => {
            return mailgun.sendEmail(
              communication.value,
              user.getClientCommEmail(),
              `New message from ${user.getFullName()}`,
              content
            )
          }).then((response) => {
            return Messages.create(
              conversation.convid,
              commId,
              content,
              response.id,
              response.message
            )
          }).then(fulfill).catch(reject)

        } else if (communication.type == "cell") {

          return Departments.findByConversationId(conversation.convid)
          .then((department) => {
            let phoneNumberId = department.phone_number;
            return PhoneNumbers.findById(phoneNumberId);
          }).then((departmentPhoneNumber) => {
            let sentFromValue = departmentPhoneNumber.value;

            contentArray.forEach((contentPortion, contentIndex) => {
              if (process.env.CCENV !== "testing") {
                twClient.sendMessage({
                  to: TESTENV ? "+18589057365" : communication.value,
                  from: sentFromValue,
                  body: content
                }, (err, msg) => {
                  if (err) {
                    reject(err)
                  } else {
                    const MessageSid = msg.sid;
                    const MessageStatus = msg.status;
                    Messages.create(conversation.convid,
                                    commId,
                                    contentPortion,
                                    MessageSid,
                                    MessageStatus)
                    .then(() => {
                      if (contentIndex == contentArray.length - 1) fulfill();
                    }).catch(reject);
                  }
                })
              }
            });

          }).catch(reject);
        }

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

  static startNewConversation (userID, clientID, subject, content, commID) {
    return new Promise((fulfill, reject) => {
      var conversation;

      Conversations.closeAllWithClient(clientID)
      .then(() => {
        return Conversations.create(userID, clientID, subject, true)
      }).then((resp) => {
        conversation = resp
        return Communications.findById(commID)
      }).then((communication) => {
        Messages.sendOne(commID, content, conversation)
        .then(() => {
          fulfill();
        }).catch(reject);
      }).catch(reject);
    }); 
  }

}

Messages.primaryId = "msgid"
Messages.tableName = "msgs"
module.exports = Messages