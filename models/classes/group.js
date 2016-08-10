'use strict';

// Libraries
const db      = require("../../server/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;


// Classes
class Group {

  static create (orgID, name, ownerID, creatorID, color) {
    return new Promise((fulfill, reject) => {
      // Color is optional
      if (!color) color = null;

      const requiredVariables = [orgID, name, ownerID, creatorID, color];
      const someValsMissing = undefinedValuesCheck(requiredVariables);

      // Reject if not all values are present
      if (someValsMissing) {
        reject("Missing required variables.")

      // Run INSERT if someValsMissing clears
      } else {
        db("groups")
        .insert({
          org:        orgID,
          name:       name,
          color:      color,
          owner:      ownerID,
          created_by: creatorID

        })
        .returning("group_id")
        .then((groupIDs) => {
          fulfill(groupIDs[0]);

        }).catch(reject);
      }
    });
  }

  static findById (groupID) {
    return new Promise((fulfill, reject) => {
      const someValsMissing = undefinedValuesCheck([group_id]);

      // Reject if not all values are present
      if (someValsMissing) {
        reject("Missing required variables.")

      // Run query otherwise
      } else {
        db("groups")
        .where("group_id", groupID)
        .limit(1)
        .then(function (groups) {
          if (groups.length > 0) {
            fulfill(groups[0])
          } else {
            fulfill()
          }
        })
        .catch(reject);
      }
    });
  }

  static addClients (clientsArray, groupID, userID) {
    // clientsArray variable is an array of clientIDs
    return new Promise((fulfill, reject) => {
      const requiredVariables = [orgID, name, ownerID, creatorID, color];
      const someValsMissing = undefinedValuesCheck(requiredVariables);

      // Reject if not all values are present
      if (someValsMissing) {
        reject("Missing required variables.")

      // Run INSERT if someValsMissing clears
      } else {
        inserArray = [];

        for (var i = 0; i < clientsArray.length; i++) {
          var clientID = clientsArray[i];

          inserArray.push({
            client:   clientID,
            group:    groupID,
            added_by: userID
          });
        }

        db("groups")
        .insert(inserArray)
        .returning("group_member_id")
        .then((memberIDs) => {
          fulfill(memberIDs);

        }).catch(reject);
      }
    });
  }

}

module.exports = Group