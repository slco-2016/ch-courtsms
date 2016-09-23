'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

class CaptureBoard {

  static findByOrg (orgId) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .leftJoin("convos", "msgs.convo", "convos.convid")
        .leftJoin("comms", "comms.commid", "msgs.comm")
        .where("convos.client", null)
        .andWhere("convos.open", true)
        .orderBy("msgs.created", "ASC")
      .then((floaters) => {

        // Reduce results to just convids, and sort incrementally
        let convos = floaters.map((ea) => { 
          return ea.convo; 
        }).reduce((a,b) => { 
          if (a.indexOf(b) < 0) {
            a.push(b);
          }
          return a;
        }, []).map((ea) => { 
          return {
            convo: ea, 
            msgs: []
          };
        });

        // Add messages to each identified convo obj
        floaters.forEach((ea) => { 
          for (var i = 0; i < convos.length; i++) {
            if (convos[i].convo == ea.convo) convos[i].msgs.push(ea);
          }
        });

        fulfill(convos)
      }).catch(reject);
    })
  }

  static removeOne (conversationId) {
    return new Promise((fulfill, reject) => {
      db("convos")
        .update({ open: false })
        .where("convid", conversationId)
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }
  
}

module.exports = CaptureBoard