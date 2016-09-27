'use strict';

// Libraries
const db        = require("../../app/db");
const Promise   = require("bluebird");


const Communications = require("../models/communications");


// Class
class CommConns {
  
  static findByClientID (clientId) {
    return new Promise((fulfill, reject) => {
      CommConns.findByClientIDs([clientId])
      .then((commconns) => {
        fulfill(commconns);
      }).catch(reject);
    })
  }
  
  static findByClientIDs (clientIDs) {
    return new Promise((fulfill, reject) => {
      db("commconns")
        .leftJoin(
          db("comms")
            .select("comms.commid", "comms.type", "comms.value")
            .as("comms"),
          "comms.commid", "commconns.comm")
        .whereIn("client", clientIDs)
        .and.where("retired", null)
      .then((commconns) => {
        fulfill(commconns);
      }).catch(reject);
    })
  }

  static getClientCommunications (clientId) {
    return new Promise((fulfill, reject) => {
      db("commconns")
        .select("commconns.*", "comms.type", "comms.value")
        .leftJoin("comms", "comms.commid", "commconns.comm")
        .whereNull("retired")
        .andWhere("commconns.client", clientId)
      .then((commConns) => {
        const commConnsIDArray = commConns.map(function (commConn) { 
          return commConn.comm;
        });
        CommConns.getUseCounts(clientId, commConnsIDArray)
        .then((counts) => {
          commConns.map(function (commConn) {
            commConn.useCount = 0;
            counts.forEach(function (count) {
              if (count.comm == commConn.comm) commConn.useCount = count.count;
            });
            return commConn;
          });
          fulfill(commConns);
        }).catch(reject);
      }).catch(reject);
    }); 
  }

  static getUseCounts (clientId, communicationIDArray) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("count(msgid), msgs.comm"))
        .leftJoin("convos", "convos.convid", "msgs.convo")
        .whereIn("comm", communicationIDArray)
        .andWhere("convos.client", clientId)
        .groupBy("msgs.comm")
      .then((counts) => {
        fulfill(counts);
      }).catch(reject);
    }); 
  }

  static create (clientId, type, name, value) {
    return new Promise((fulfill, reject) => {
      Communications.findByValue(value)
      .then((communication) => {
        console.log("XX" , clientId, type, name, value);
        // if a communication method already exists just create a reference 
        if (communication) {
          db("commconns")
            .insert({
              client: clientId,
              comm: communication.commid,
              name: name
            })
          .then((success) => { 
            fulfill();
          }).catch(reject);
        } else {
          Communications.create(type, name, value)
          .then((communication) => { 
            db("commconns")
              .insert({
                client: clientId,
                comm: communication.commid,
                name: name
              })
            .then((success) => { 
              fulfill();
            }).catch(reject);
          }).catch(reject);
        }
        return null
      }).catch(reject);


    }); 
  }

}

module.exports = CommConns