'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

const Clients = require("../models/clients");
const Conversations = require("../models/conversations");
const Communications = require("../models/communications");
const Departments = require("../models/departments");
const Messages = require("../models/messages");
const Users = require("../models/users");

module.exports = {

  processIncoming (toNumber, fromNumber, text, MessageStatus, MessageSID) {
    let clients, communication, conversations, departmentIds, userIds;
    return new Promise ((fulfill, reject) => {
      Departments.findByPhoneNumber(toNumber)
      .then((resp) => {
        departmentIds = resp.map((department) => {
          return department.department_id;
        });
        console.log("***********", departmentIds);
        console.log("***********", departmentIds);
        return Communications.getOrCreateFromValue(fromNumber, "cell")
      }).then((resp) => {
        communication = resp;
        return Clients.findByCommId(communication.commid);
      }).then((resp) => {
        clients = resp;
        let userIds = clients.map((client) => {
          return client.cm;
        });
        return Users.findByIds(userIds);
      }).then((resp) => {
        userIds = resp.filter((user) => {
          return departmentIds.indexOf(user.department) > -1;
        }).map((user) => {
          return user.cmid;
        });
        return Conversations.findOrCreate(clients, communication.commid);
      }).then((resp) => {
        conversations = resp;
        let conversationIds = conversations.filter((conversation) => {
          return userIds.indexOf(conversation.cm) > -1 || conversation.cm == null;
        }).map((conversation) => {
          return conversation.convid;
        });
        return Messages.createMany( conversationIds,
                                    communication.commid,
                                    text,
                                    MessageSID,
                                    MessageStatus);
      }).then((messages) => {
        fulfill(conversations);
      }).catch(reject);
    });
  }

};