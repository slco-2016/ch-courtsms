'use strict';

// Libraries
const db      = require("../../server/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;


const CommConns = require("./commConns");
const Conversations = require("./conversations");



class NotificationsView {

  getNotifications() {

  }

  show(req, res) {
    if (isOwner) {
      return this._showOwnders()
    }
  }

  _showOwnders()  {

  }

  edit(req, rest) {

  }

}


// Class
class Client {

  static findByID (clientID) {
    return new Promise((fulfill, reject) => {
      var finalClientsObject;
      db("clients")
        .select("clients.*", 
                "color_tags.color as color_tag", 
                "color_tags.name as color_name")

        // Join with color tag table
        .leftJoin(
          db("color_tags")
            .where("active", true)
            .as("color_tags"),
          "color_tags.color_tag_id", "clients.color_tag")

        // Only where active T/F and case manager matches
        .where("clients.clid", clientID)
        .limit(1)

      .then(function (clients) {

        // Need to make sure there is a default color_tag color
        finalClientsObject = clients.map(function (client) {
          if (!client.color_tag) client.color_tag = "#898989";
          if (!client.color_tag) client.color_name = "None";
          return client;
        });

        const clientIDs = finalClientsObject.map(function (client) {
          return client.clid;
        });

        return CommConns.findByClientIDs(clientIDs)
      }).then((commConns) => {
        finalClientsObject = finalClientsObject.map(function (client) {
          client.communications = [];
          commConns.forEach(function (commconn) {
            if (client.clid == commconn.client) {
             client.communications.push(commconn) 
            }
          });
          return client;
        });
        fulfill(finalClientsObject[0]);
      }).catch(reject);
    })
  }

  static editOne (clientID, first, middle, last, dob, uniqueID1, uniqueID2) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .update({
          first: first,
          middle: middle,
          last: last,
          dob: dob,
          so: uniqueID1,
          otn: uniqueID2
        })
        .where("clid", clientID)
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static alterCase (clientID, active) {
    if (typeof active == "undefined") active = true;

    return new Promise((fulfill, reject) => {
      db("clients")
        .update({ active: active })
        .where("clid", clientID)
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static udpateColorTag (clientID, colorTagID) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .update({ color_tag: colorTagID })
        .where("clid", clientID)
      .then(() => {
        fulfill()
      }).catch(reject);
    });
  }

  static create (userID, first, middle, last, dob, otn, so) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .insert({
          cm:     userID,
          first:  first,
          middle: middle,
          last:   last,
          dob:    dob,
          otn:    otn,
          so:     so,
          active: true
        })
        .returning("clid")
      .then((clientIDs) => {
        fulfill(clientIDs[0]);
      }).catch(reject);
    });
  }

  static transfer (clientID, fromUserID, toUserID, bundleConversations) {
    if (typeof bundleConversations == "undefined") bundleConversations = true;
    return new Promise((fulfill, reject) => { 
      db("clients")
        .where("clid", clientID)
        .andWhere("cm", fromUserID)
        .update({ cm: toUserID })
      .then(() => {
      //   return db()
      // .then(() => {

        if (bundleConversations) {
          // also switch convos
          Conversations.transferUserReference(clientID, fromUserID, toUserID)
          .then(() => {
            fulfill()
          }).catch(reject);
        } else {
          fulfill()
        }
      }).catch(reject);
    });   
  }

  static logActivity (clientID) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .where("clid", clientID)
        .update({ updated: db.fn.now() })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
}

module.exports = Client