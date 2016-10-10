'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");
const BaseModel = require("../lib/models").BaseModel

let moment = require("moment");
let moment_tz = require("moment-timezone");

const resourceRequire = require('../lib/resourceRequire')
const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages')
const Conversations = resourceRequire('models', 'Conversations')
const Messages = resourceRequire('models', 'Messages')

const voice = resourceRequire('lib', 'voice')


// Class
class Notifications extends BaseModel {
  
  constructor(data) {
    super({
      data: data,
      columns: [
        "notificationid",
        "cm",
        "client",
        "comm", 
        "subject",
        "message",
        "created",
        "updated",
        "send",
        "repeat",
        "frequency",
        "sent",
        "closed",
        "repeat_terminus",
        "ovm_id",
      ]
    })
  }

  static checkAndSendNotifications () {
    return new Promise((fulfill, reject) => {
      db("notifications")
        // .select("notifications.*", "comms.type", "comms.value")
        // .leftJoin("comms", "notifications.comm", "comms.commid")
        .where("send", "<", db.fn.now())
        .andWhere("notifications.sent", false)
        .andWhere("notifications.closed", false)
      .then((notifications) => {
        return new Promise((fulfill, reject) => {
          fulfill(notifications);
        });
      }).map((notification) => {

        // Voice
        if (notification.ovm_id) {
          return this.sendOVMNotification(notification)

        // Email or Text
        } else {
          return this.sendTextorEmailNotification(notification);
        }
      }).then((resp) => {
        fulfill();
      }).catch(reject);
    });
  }

  static sendOVMNotification (notification) {
    return new Promise((fulfill, reject) => {
      OutboundVoiceMessages.findById(notification.ovm_id)
      .then((ovm) => {
        return voice.processPendingOutboundVoiceMessages(ovm)
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  };

  static sendTextorEmailNotification (notification) {
    return new Promise((fulfill, reject) => {
      var client = notification.client;
      let userId = notification.cm;
      let clientId = notification.client;
      let subject = notification.subject || "Sent Notification";
      let content = notification.message;
      let commId = notification.comm;
      let sendMethod;

      if (commId) {
        sendMethod = Messages.startNewConversation(userId, clientId, subject, content, commId);
      } else {
        sendMethod = Messages.smartSend(userId, clientId, subject, content);
      }

      sendMethod.then(() => {console.log("kook")
        return this.markAsSent(notification.notificationid);
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static markAsSent (notificationId) {
    return new Promise((fulfill, reject) => {
      db("notifications")
      .where("notificationid", notificationId)
      .update({
        sent: true
      }).then(() => {
        fulfill();
      }).catch(reject);
    })
  }

  static findByUser (userID, sent) {
    if (typeof sent == "undefined") sent = false;
    const order = sent ? "desc" : "asc";

    return new Promise((fulfill, reject) => {
      db("notifications")
        .leftJoin(
          db("clients")
            .select(db.raw("first, middle, last, clid"))
            .as("clients"),
          "clients.clid", "notifications.client")
        .where("cm", userID)
        .andWhere("sent", sent)
        .andWhere("closed", false)
        .orderBy("send", order)
      .then((notifications) => {
        fulfill(notifications)
      }).catch(reject);
    })
  }

  static findByClientID (clientId, sent) {
    if (typeof sent == "undefined") sent = false;
    const order = sent ? "desc" : "asc";
    
    return new Promise((fulfill, reject) => {
      db("notifications")
        .leftJoin(
          db("clients")
            .select(db.raw("first as first, middle as middle, last as last, clid"))
            .as("clients"),
          "clients.clid", "notifications.client")
        .leftJoin(
          db("cms")
            .select(db.raw("first as creator_first, last as creator_last, department as creator_department, cmid as creator_id"))
            .as("cms"),
          "cms.creator_id", "notifications.cm")
        .leftJoin(
          db("commconns")
            .select(db.raw("name as communication_name, comm, commconnid"))
            .where("client", clientId)
            .as("commconns"), 
            "commconns.comm", "notifications.comm")
        .where("client", clientId)
        .andWhere("sent", sent)
        .andWhere("closed", false)
        .orderBy("send", order)
      .then((notifications) => {
        fulfill(notifications)
      }).catch(reject);
    })
  }

  static findByID (notificationID) {
    return new Promise((fulfill, reject) => {
      db("notifications")
        .where("notificationid", notificationID)
        .limit(1)
      .then((notifications) => {
        fulfill(notifications[0])
      }).catch(reject);
    })
  }

  static removeOne (notification) {
    return new Promise((fulfill, reject) => {
      db("notifications")
        .update({ closed: true })
        .where("notificationid", notification)
        .returning("*")
      .then((n) => {
        fulfill(n[0])
      }).catch(reject);
    })
  }

  static editOne (notificationID, clientID, commID, send, subject, message) {
    if (!commID || commID == "null") commID = null;
    var f = moment(send).format("ha z")
    console.log("SEND ", f);
    
    return new Promise((fulfill, reject) => {
      db("notifications")
        .update({
          client: clientID,
          comm: commID,
          subject: subject,
          message: message,
          send: send
        })
        .where("notificationid", notificationID)
        .returning("*")
      .then((n) => {
        fulfill(n[0])
      }).catch(reject);
    })
  }

  static create (userID, clientID, commID, subject, message, send, ovm_id) {
    return new Promise((fulfill, reject) => {
      db("notifications")
        .insert({
          cm: userID,
          client: clientID,
          comm: commID,
          subject: subject,
          message: message,
          send: send,
          ovm_id: ovm_id || null,
          repeat: false,
          frequency: null,
          sent: false,
          closed: false,
          repeat_terminus: null
        })
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

}

Notifications.primaryId = "notificationid"
Notifications.tableName = "notifications"

module.exports = Notifications