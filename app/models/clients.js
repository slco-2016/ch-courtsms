'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

const CommConns = require("./commConns");
const Users = require("./users");

const colors = require("colors")


// Class
class Clients {

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

  static findAllByUser (userIDs) {
    console.log("Warning! Clients method findAllByUser() deprecated, use findAllByUsers()");
    if (!Array.isArray(userIDs)) userIDs = [userIDs];
    return new Promise((fulfill, reject) => {
      Clients.findAllByUsers(userIDs)
      .then((clients) => {
        return fulfill(clients);
      }).catch(reject);
    });
  }

  static findAllByUsers (userIDs) {
    if (!Array.isArray(userIDs)) userIDs = [userIDs];
    return new Promise((fulfill, reject) => {
      var clientsOpen;
      Clients.findByUsers(userIDs, true)
      .then((clients) => {
        clientsOpen = clients;
        return Clients.findByUsers(userIDs, false)
      }).then((clientsClosed) => {
        return fulfill(clientsOpen.concat(clientsClosed));
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
  
}

module.exports = Clients


