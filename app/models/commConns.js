'use strict';

// Libraries
const db        = require("../../app/db");
const Promise   = require("bluebird");


const Communications = require("../models/communications");


// Class
class CommConns {
  
  static findByClientID (clientID) {
    return new Promise((fulfill, reject) => {
      CommConns.findByClientIDs([clientID])
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

  static getClientCommunications (clientID) {
    return new Promise((fulfill, reject) => {
      db("commconns")
        .select("commconns.*", "comms.type", "comms.value")
        .leftJoin("comms", "comms.commid", "commconns.comm")
        .whereNull("retired")
        .andWhere("commconns.client", clientID)
      .then((commConns) => {
        const commConnsIDArray = commConns.map(function (commConn) { 
          return commConn.comm;
        });
        CommConns.getUseCounts(clientID, commConnsIDArray)
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

  static getUseCounts (clientID, communicationIDArray) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("count(msgid), msgs.comm"))
        .leftJoin("convos", "convos.convid", "msgs.convo")
        .whereIn("comm", communicationIDArray)
        .andWhere("convos.client", clientID)
        .groupBy("msgs.comm")
      .then((counts) => {
        fulfill(counts);
      }).catch(reject);
    }); 
  }

  static createOne (clientID, type, name, value) {
    return new Promise((fulfill, reject) => {
      Communications.findByValue(value)
      .then((comm) => {
        // if a comm method already exists just create a reference 
        if (comm) {
          db("commconns")
            .insert({
              client: clientID,
              comm: comm.commid,
              name: name
            })
          .then((success) => { 
            fulfill();
          }).catch(reject);
        } else {
          Communications.createOne(type, name, value)
          .then((commID) => { 
            db("commconns")
              .insert({
                client: clientID,
                comm: commID,
                name: name
              })
            .then((success) => { 
              fulfill();
            }).catch(reject);
          }).catch(reject);
        }
      }).catch(reject);


    }); 
  }

}

module.exports = CommConns