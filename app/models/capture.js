'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

const CommConns = require("../models/commConns");
const Communications = require("../models/communications");
const Conversations = require("../models/conversations");
const Messages = require("../models/messages");

class CaptureBoard {

  static findByOrg (orgId) {
    return new Promise((fulfill, reject) => {
      db("msgs")
        .leftJoin("convos", "msgs.convo", "convos.convid")
        .leftJoin("comms", "comms.commid", "msgs.comm")
        .leftJoin("commconns", "commconns.commconnid", "comms.commid")
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
          for (let i = 0; i < convos.length; i++) {
            if (convos[i].convo == ea.convo) convos[i].msgs.push(ea);
          }
        });

        fulfill(convos)
      }).catch(reject);
    })
  }

  static findByConversationId (orgId, conversationId) {
    return new Promise((fulfill, reject) => {
      CaptureBoard.findByOrg(orgId)
      .then((conversations) => {
        conversations = conversations.filter((convo) => {
          return Number(conversationId) == convo.convo;
        });
        fulfill(conversations[0])
      }).catch(reject);
    })
  }

  static associateConversation (user, client, conversationId) {
    return new Promise((fulfill, reject) => {
      let subject = "Captured Conversation from New Contact";
      let deviceName = "New Captured Method";
      let clientcomms, comms, conversation;

      Conversations.findById(conversationId)
      .then((resp) => {
        conversation = resp;
        return Messages.findByConversation(conversation)
      }).then((resp) => {
        let messages = resp;
        let commId = messages[0].comm;
        return Communications.findById(commId)
      }).then((resp) => {
        let communcation = resp;
        return Conversations.closeAllCapturedWithCertainCommunication(communcation)
      }).then((resp) => {
        // Query 1: Update convo with CM and client
        return db("convos")
          .where("convid", conversationId)
          .update({
            subject: subject,
            client: client,
            cm: user,
            accepted: true,
            open: true
          })
          .returning("*");
      }).then((resp) => {
        return Conversations.findById(conversationId)
      }).then((resp) => {

        // Query 2: Close all other conversation that client has open
        return db("convos")
          .whereNot("convid", conversationId)
          .andWhere("cm", user)
          .andWhere("client", client)
          .update({ open: false })
      }).then(() => {

        // Query 3: Gather comm forms used in that conversation (should be only one)
        return db("msgs")
          .where("convo", conversationId)
          .andWhere("inbound", true)
          .pluck("comm")
      }).then((resp) => {
        comms = resp;

        // Query 4: Gather comms that the CM currently has
        return db("commconns")
          .where("client", client)
          .andWhere("retired", null)
          .pluck("comm")
      }).then((resp) => {
        clientcomms = resp;

        // Remove duplicates
        comms = comms.reduce(function (a,b) { 
          if (a.indexOf(b) < 0 ) {
            a.push(b);
          }
          return a;
        },[]);

        // Filter so you only have new comms that CM does not have captured yet
        comms = comms.filter(function (comm) { 
          return clientcomms.indexOf(comm) == -1; 
        });

        // Prepare a list of new clientcomm objects
        let insertList = [];
        comms.forEach((comm, i) => {

          // If there is more than one commconn being added, name the second ones automatically
          // TO DO: We need them to be able to name all comm methods in POST (if common)
          let name = i == 0 ? deviceName : deviceName + "_num_" + String(i + 1);
          
          insertList.push({
            client: client,
            comm: comm,
            name: name
          });
        });

        // Run query only if there is stuff to enter
        if (insertList.length > 0) {

          // Query 5: Insert the new commconns
          db("commconns")
            .insert(insertList)
          .then(function () {
            fulfill();
          }).catch(reject); // Query 5
        
        } else {
          fulfill();
        }

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