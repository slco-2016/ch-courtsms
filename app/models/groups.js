'use strict';

// Libraries
const db      = require('../../app/db');
const Promise = require('bluebird');

// Models
const Messages = require('./messages');


// Class
class Groups {
  
  static findByUser (userID, active) {
    if (typeof active == 'undefined') active = true;
    let groupsComplete;
    return new Promise((fulfill, reject) => {
      db('groups')
        .where('user', userID)
        .andWhere('active', active)
        .orderBy(
          db.raw('upper(left(name, 1)), (substring(name from 2) || \'\')::varchar'), 
          'asc')
      .then((groups) => {
        groupsComplete = groups;
        const groupIDs = groups.map(function (group) {
          return group.group_id;
        });

        return Groups.findMembers(groupIDs);
      }).then((members) => {
        groupsComplete.map(function (group) {
          group.members = [];
          members.forEach(function (member) {
            if (member.group == group.group_id) group.members.push(member);
          });
          return group;
        });
        fulfill(groupsComplete);
      }).catch(reject);
    });
  }
  
  static findMembers (groupIDs) {
    if (!Array.isArray(groupIDs)) groupIDs = [groupIDs,];
    return new Promise((fulfill, reject) => {
      db('group_members')
        .leftJoin('clients', 'clients.clid', 'group_members.client')
        .whereIn('group', groupIDs)
        .andWhere('group_members.active', true)
        .andWhere('clients.active', true)
      .then((members) => {
        fulfill(members);
      }).catch(reject);
    });
  }

  static findByID (groupID) {
    return new Promise((fulfill, reject) => {
      db('groups')
        .where('group_id', groupID)
        .limit(1)
      .then((groups) => {
        const group = groups[0];
        if (group) {
          return Groups.findMembers(group.group_id)
          .then((members) => {
            group.members = [];
            members.forEach(function (member) {
              if (member.group == group.group_id) group.members.push(member);
            });
            fulfill(group);
          }).catch(reject);
        } else {
          fulfill();
        }
      }).catch(reject);
    });
  }
  
  static removeOne (groupID) {
    return new Promise((fulfill, reject) => {
      db('groups')
        .update({ active: false, })
        .where('group_id', groupID)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
  static activateOne (groupID) {
    return new Promise((fulfill, reject) => {
      db('groups')
        .update({ active: true, })
        .where('group_id', groupID)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
  static editOne (userID, groupID, name, clientIDs) {
    return new Promise((fulfill, reject) => {
      db('groups')
        .update({ name: name, })
        .where('group_id', groupID)
      .then(() => {
        return Groups.updateMembersOne(userID, groupID, clientIDs);
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static updateMembersOne (userID, groupID, clientIDs) {
    return new Promise((fulfill, reject) => {
      let activeClients;
      db('group_members')
        .whereIn('client', clientIDs)
        .andWhere('group', groupID)
        .update({ active: true, })
        .returning('client')
      .then((clients) => {
        activeClients = clients;
        return db('group_members')
        .whereNotIn('client', clientIDs)
        .andWhere('group', groupID)
        .update({ active: false, });
      }).then(() => {

        clientIDs = clientIDs.filter(function (ID) {
          return activeClients.indexOf(Number(ID)) < 0;
        });

        return Groups.addGroupMembers(userID, groupID, clientIDs);
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static addGroupMembers (userID, groupID, clientIDs) {
    return new Promise((fulfill, reject) => {
      const insertArray = clientIDs.map(function (clientID) {
        return {
          group: groupID,
          client: clientID,
          active: true,
        };
      });
      db('group_members')
        .insert(insertArray)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
  static insertNew (userID, name, clientIDs) {
    return new Promise((fulfill, reject) => {
      db('groups')
        .insert({
          name: name,
          user: userID,
          active: true,
        })
        .returning('group_id')
      .then((groupIDs) => {
        const groupID = groupIDs[0];
        if (groupID) {
          const insertArray = clientIDs.map(function (clientID) {
            return {
              group: groupID,
              client: clientID,
              active: true,
            };
          });
          db('group_members')
            .insert(insertArray)
          .then(() => {
            fulfill();
          }).catch(reject);
        } else {
          reject('Failed create a new group and return ID.');
        }
      }).catch(reject);
    });
  }

  static addressMembers (userID, groupID, title, content) {
    return new Promise((fulfill, reject) => {
      Groups.findMembers(groupID)
      .then((clients) => {
        const clientIDs = clients.map(function (client) { return client.clid; });
        return Messages.sendMultiple(userID, clientIDs, title, content);
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

}

module.exports = Groups;