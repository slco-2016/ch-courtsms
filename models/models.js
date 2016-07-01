'use strict';
const credentials = require("../credentials");
const TWILIO_NUM = credentials.twilioNum;

// TODO: this should be handled elswhere and imported as twClient
const ACCOUNT_SID = credentials.accountSid;
const AUTH_TOKEN = credentials.authToken;
const twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

const mailgun = require("../utils/mailgun")

const db  = require("../server/db");
const Promise = require("bluebird");

class Communication {
  constructor(databaseObject){
    this.type = databaseObject.type
    this.value = databaseObject.value
    this.commid = databaseObject.commid
    this.description = databaseObject.description
    this.updated = databaseObject.updated
    this.created = databaseObject.created
  }
  static findById(id) {
    return new Promise((fulfill, reject) => {
      db("comms")
      .where("commid", id)
      .limit(1)
      .then(function (comms) {
        if (comms.length > 0) {
          let communication = new Communication(comms[0])
          fulfill(communication)
        } else {
          fulfill()
        }
      })
      .catch(reject)      
    })
  }
  _createMessage(convid, content, id, status) {
    return Message.create({
      convo: convid,
      comm: this.commid,
      content: content,
      inbound: false,
      read: true,
      tw_sid: id,
      tw_status: status,
    })
  }
  sendMessage(convid, content) {
    return new Promise((fulfill, reject) => {
      if (this.type == "cell") {
        twClient.sendSms({
          to: this.value,
          from: TWILIO_NUM,
          body: content
        }, (err, msg) => {
          if (err) {
            console.log("Twilio send error: ", err);
            if (err.hasOwnProperty("code") && err.code == 21211) {
              custErr = new Error("That number is not a valid phone number.")
              reject(custErr)
            } else {
              reject(err)
            }
          } else {
            return this._createMessage(
              convid, 
              content, 
              msg.sid, 
              msg.status
            ).then(fulfill).catch(reject)
          }
        });
      } else if (this.type == "email") {
        mailgun.sendEmail(
          this.value, 
          "test@clientcomm.org", 
          "New message from Max McDonnell",
          content
        ).then((response) => {
          return this._createMessage(
            convid,
            content,
            response.id,
            response.message
          )
        }).then(fulfill).catch(reject)
      }
    })
  }
}

class Message {
  constructor(databaseObject){
    this.convid = databaseObject.convid
    this.commid = databaseObject.commid
    this.content = databaseObject.content
    this.inbound = databaseObject.inbound
    this.read = databaseObject.read
    this.tw_sid = databaseObject.tw_sid
    this.tw_status = databaseObject.status
  }
  static create(messageObject) {
    return new Promise((fulfill, reject) => {
      db("msgs")
      .insert(messageObject).returning("msgid")
      .then((messageIds) => {
        fulfill(messageIds[0])
      }).catch(reject)
    })
  }
}

class Convo {
  static closeAll(cmid, clid) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .where("client", clid)
        .andWhere("cm", cmid)
        .andWhere("convos.open", true)
        .pluck("convid")
        .then(function (convos) {
          db("convos").whereIn("convid", convos)
            .update({
              open: false
            }).then(function (success) {
              fulfill(success)
            })
            .catch(reject)
        })
        .catch(reject)
    })
  }

  static create(cmid, clid, subject, open) {
    if (!open) {
      open = true;
    }
    return new Promise((fulfill, reject) => {
      db("convos")
      .insert({
        cm: cmid,
        client: clid,
        subject: subject,
        open: open,
        accepted: true,
      }).returning("convid").then((convoIds) => {
        fulfill(convoIds[0])
      }).catch(reject)
    })
  }
}

module.exports = {
  Convo: Convo,
  Communication: Communication,
  Message: Message,
}