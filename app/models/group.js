'use strict';

// Libraries
const db      = require('../../app/db');
const Promise = require('bluebird');


// TO DOS


// Classes
class Group {

  static create (orgID, name, ownerID, creatorID, color) {
    return new Promise((fulfill, reject) => {
      // Color is optional
      if (!color) color = null;
      
      db('groups')
      .insert({
        org:        orgID,
        name:       name,
        color:      color,
        owner:      ownerID,
        created_by: creatorID,

      })
      .returning('group_id')
      .then((groupIDs) => {
        fulfill(groupIDs[0]);

      }).catch(reject);
    });
  }

  static remove (groupID) {
    // clientsArray variable is an array of clientIDs
    return new Promise((fulfill, reject) => {
      const someValsMissing = undefinedValuesCheck([groupID,]);

      // Reject if not all values are present
      if (someValsMissing) {
        reject('Missing required variables.');

      // Run UPDATE if someValsMissing clears
      } else {
        db('groups')
        .update({active: false,})
        .where('group_id', groupID)
        .then((success) => {
          fulfill();
        }).catch(reject);
      }
    });
  }

  static findById (groupID) {
    return new Promise((fulfill, reject) => {
      const someValsMissing = undefinedValuesCheck([group_id,]);

      // Reject if not all values are present
      if (someValsMissing) {
        reject('Missing required variables.');

      // Run query otherwise
      } else {
        db('groups')
        .where('group_id', groupID)
        .limit(1)
        .then(function (groups) {
          if (groups.length > 0) {
            fulfill(groups[0]);
          } else {
            fulfill();
          }
        })
        .catch(reject);
      }
    });
  }

  static addClients (clientsArray, groupID, userID) {
    // clientsArray variable is an array of clientIDs
    return new Promise((fulfill, reject) => {
      inserArray = [];

      for (let i = 0; i < clientsArray.length; i++) {
        const clientID = clientsArray[i];

        inserArray.push({
          client:   clientID,
          group:    groupID,
          added_by: userID,
        });
      }

      db('groups')
      .insert(inserArray)
      .returning('group_member_id')
      .then((memberIDs) => {
        fulfill(memberIDs);
      }).catch(reject);
    });
  }

  static removeClients (groupMemberIDArray) {
    // clientsArray variable is an array of clientIDs
    return new Promise((fulfill, reject) => {
      const someValsMissing = undefinedValuesCheck([groupMemberIDArray,]);

      // Reject if not all values are present
      if (someValsMissing) {
        reject('Missing required variables.');

      // Run INSERT if someValsMissing clears
      } else {

        db('groups')
        .whereIn('group_member_id', groupMemberIDArray)
        .del()
        .then((success) => {
          fulfill(success);
        }).catch(reject);
      }
    });
  }

}

module.exports = Group;