'use strict';

const db  = require("../server/db");
const Promise = require("bluebird");

class Communication {
  static findById(id) {
    return new Promise((fulfill, reject) => {
      db("comms")
      .where("commid", id)
      .limit(1)
      .then(function (comms) {
        if (comms.length > 0) {
          fulfill(comms[0])
        } else {
          fulfill()
        }
      })
      .catch(reject)      
    })
  }
}

class Message {
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