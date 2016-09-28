'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

const Conversations = require("./conversations");
const CommConns = require("./commConns");
const Departments = require("./departments");
const Users = require("./users");

const colors = require("colors")

const BaseModel = require("../lib/models").BaseModel;

class Clients extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        "clid",
        "cm",
        "first",
        "middle",
        "last", 
        "dob",
        "otn",
        "so",
        "active",
        "color_tag",
        "updated",
        "created"
      ]
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

  static create (userId, first, middle, last, dob, otn, so) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .insert({
          cm:     userId,
          first:  first,
          middle: middle,
          last:   last,
          dob:    dob,
          otn:    otn,
          so:     so,
          active: true
        })
        .returning("*")
      .then((clients) => {
        this._getSingleResponse(clients, fulfill)
      }).catch(reject);
    });
  }

  static editOne (clientId, first, middle, last, dob, uniqueID1, uniqueID2) {
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
        .where("clid", clientId)
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static findAllByUsers (userIds) {
    if (!Array.isArray(userIds)) userIds = [userIds];
    return new Promise((fulfill, reject) => {
      var clientsOpen;
      Clients.findByUsers(userIds, true)
      .then((clients) => {
        clientsOpen = clients;
        return Clients.findByUsers(userIds, false)
      }).then((clientsClosed) => {
        return fulfill(clientsOpen.concat(clientsClosed));
      }).catch(reject);
    });
  }

  static findByCommId (commId) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .leftJoin(
          db("commconns")
            .whereNull("retired")
            .as("commconns"), 
          "commconns.comm", commId)
      .then((clients) => {
        this._getMultiResponse(clients, fulfill)
      }).catch(reject);
    })
  }

  static findByDepartment (departmentId, status) {
    if (typeof status == "undefined") status = true;

    return new Promise((fulfill, reject) => {
      Users.findAllByDepartment(departmentId)
      .then((users) => {
        let userIds = users.map(function (u) { return u.cmid; });
        return Clients.findByUsers(userIds, status)
      }).then((c) => {
        return fulfill(c);
      }).catch(reject);
    });
  }

  static findByID (clientId) {
    return new Promise((fulfill, reject) => {
      var finalClientsObject;
      db("clients")
        .select("clients.*", 
                "cms.cmid as user_id",
                "cms.first as user_first",
                "cms.middle as user_middle",
                "cms.last as user_last",
                "cms.department as department",
                "color_tags.color as color_tag", 
                "color_tags.name as color_name")

        .leftJoin("cms", "clients.cm", "cms.cmid")
        .leftJoin(
          db("color_tags")
            .where("active", true)
            .as("color_tags"),
          "color_tags.color_tag_id", "clients.color_tag")

        // Only where active T/F and case manager matches
        .where("clients.clid", clientId)
        .limit(1)

      .then(function (clients) {
        // Need to make sure there is a default color_tag color
        finalClientsObject = clients.map(function (client) {
          if (!client.color_tag) client.color_tag = "#898989";
          if (!client.color_tag) client.color_name = "None";
          return client;
        });

        const clientIds = finalClientsObject.map((client) => {
          return client.clid;
        });

        return CommConns.findByClientIDs(clientIds)
      
      }).then((commConns) => {
        finalClientsObject = finalClientsObject.map((client) => {
          client.communications = [];
          commConns.forEach((commconn) => {
            if (client.clid == commconn.client) {
             client.communications.push(commconn) 
            }
          });
          return client;
        });

        finalClientsObject = finalClientsObject[0];

        return Departments.findByMember(finalClientsObject.cm)
      }).then((department) => {
        if (finalClientsObject) {
          if (department) {
            finalClientsObject.department = department;  
          } else {
            finalClientsObject.department = {};
          }
        } else {
          finalClientsObject = {};
        }
        fulfill(finalClientsObject);
      }).catch(reject);
    })
  }

  static findByManager (userIDs, active) {
    // findByManager deprecated, use findByUsers
    console.log("Warning! Clients method findByManager() deprecated, use findByUsers()");
    if (!Array.isArray(userIDs)) userIDs = [userIDs];
    return new Promise((fulfill, reject) => {
      Clients.findAllByUsers(userIDs, active)
      .then((clients) => {
        return fulfill(clients);
      }).catch(reject);
    });
  }

  static findByOrg (orgId, status) {
    if (typeof status == "undefined") status = true;

    return new Promise((fulfill, reject) => {
      Users.findByOrg(orgId)
      .then((users) => {
        let userIds = users.map(function (u) { return u.cmid; });
        return Clients.findByUsers(userIds, status)
      }).then((c) => {
        return fulfill(c);
      }).catch(reject);
    });
  }

  static findByUser (userIDs, active) {
    console.log("Warning! Clients method findAllByUser() deprecated, use findByUsers()".red);
    return new Promise((fulfill, reject) => {
      Clients.findByUsers(userIDs, active)
      .then((clients) => {
        return fulfill(clients);
      }).catch(reject);
    });
  }

  static findByUsers (userIDs, activeStatus) {
    if (typeof activeStatus == "undefined") activeStatus = true;
    if (!Array.isArray(userIDs)) userIDs = [userIDs];

    return new Promise((fulfill, reject) => {
      var finalClientsObject;

      db("clients")
        .select("clients.*", 
                "cms.cmid as user_id",
                "cms.first as user_first",
                "cms.middle as user_middle",
                "cms.last as user_last",
                "cms.department as department",
                "color_tags.color as color_tag", 
                "color_tags.name as color_name")

        // Join with color tag table
        .leftJoin(
          db("color_tags")
            .where("active", true)
            .as("color_tags"),
          "color_tags.color_tag_id", "clients.color_tag")

        .leftJoin("cms", "clients.cm", "cms.cmid")

        .whereIn("clients.cm", userIDs)
        .andWhere("clients.active", activeStatus)
        .orderBy(
          db.raw("upper(left(clients.last, 1)), (substring(clients.last from 2) || '')::varchar"), 
          "asc")
      .then(function (clients) {

        // Need to make sure there is a default color_tag color
        finalClientsObject = clients.map(function (client) {
          if (!client.color_tag) client.color_tag = "#898989";
          if (!client.color_tag) client.color_name = "None";
          return client;
        });

        // Get unread messages and add them to client list
        return Clients.getUnreadMessages(userIDs)
      }).then((unreads) => {
        finalClientsObject = finalClientsObject.map(function (client) {
          client.unread = 0;
          unreads.forEach(function (unread) {
            if (unread.client == client.clid) client.unread = Number(unread.unread);
          });
          return client;
        });

        // Now get all clientIDs to get Comm. Connections
        var clientIDs = finalClientsObject.map(function (client) {
          return client.clid
        });

        return CommConns.findByClientIDs(clientIDs)
      }).then((commconns) => {
        // Add each communication method to relevant client
        finalClientsObject = finalClientsObject.map(function (client) {
          client.communications = [];
          commconns.forEach(function (commconn) {
            if (client.clid == commconn.client) {
             client.communications.push(commconn) 
            }
          });
          return client;
        });
        return fulfill(finalClientsObject);
      }).catch(reject);
    });
  }

  static getUnreadMessages (userIDs) {
    if (!Array.isArray(userIDs)) userIDs = [userIDs];
    return new Promise((fulfill, reject) => {
      db("msgs")
        .select(db.raw("count(msgs.read) as unread, client"))
        .leftJoin("convos", "convos.convid", "msgs.convo")
        .whereIn("convos.cm", userIDs)
        .andWhere("msgs.read", false)
        .groupBy("convos.client")
      .then(function (unreads) {
        return fulfill(unreads)
      }).catch(reject);
    })
  }

  static logActivity (clientID) {
    return new Promise((fulfill, reject) => {
      db("clients")
        .where("clid", clientID)
        .update({ updated: db.fn.now() })
      .then(() => {
        fulfill();
      }).catch(reject);
      return null
    });
  }

  static transfer (client, fromUser, toUser, bundle) {
    if (typeof bundle == "undefined") bundle = true;

    return new Promise((fulfill, reject) => { 
      db("clients")
        .where("clid", client)
        .andWhere("cm", fromUser)
        .update({ cm: toUser })
      .then(() => {

        if (bundle) {
          // also switch convos
          Conversations.transferUserReference(client, fromUser, toUser)
          .then(() => {
            fulfill()
          }).catch(reject);

        } else {
          fulfill()
        }
      }).catch(reject);
    });   
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
  
}

module.exports = Clients


