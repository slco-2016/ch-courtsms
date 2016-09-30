'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

const Clients = require("../models/clients");
const Conversations = require("../models/conversations");
const Communications = require("../models/communications");
const CommConns = require("../models/commConns");
const Departments = require("../models/departments");
const Messages = require("../models/messages");
const Users = require("../models/users");

module.exports = {

  processIncoming (toNumber, fromNumber, text, MessageStatus, MessageSID) {
    let clients, communication, conversations, departmentIds, users;
    return new Promise ((fulfill, reject) => {

      // First get all departments associated with number
      Departments.findByPhoneNumber(toNumber)
      .then((resp) => {

        // Extract just the department IDs out
        departmentIds = resp.map((department) => {
          return department.department_id;
        });
        console.log("***********", departmentIds);
        console.log("***********", departmentIds);

        // Next, get or create a basic comm row
        return Communications.getOrCreateFromValue(fromNumber, "cell")
      }).then((resp) => {
        communication = resp;

        // From that resulting comm, see all clients attached by
        // active communication connections
        return Clients.findByCommId(communication.commid);
      }).then((resp) => {
        clients = resp;

        // Get all the case managers that are related to those clients
        let allUserIdsRelatedToClients = clients.map((client) => {
          return client.cm;
        });

        // Query for the rows associated with those users (case managers)
        return Users.findByIds(allUserIdsRelatedToClients);
      }).then((resp) => {

        // Only keep the users that are in the departments that 
        // are related with that toNumber
        users = resp.filter((user) => {
          return departmentIds.indexOf(user.department) > -1;
        });

        // Reduce clients list to only clients that are in 
        // the list of in-department users
        let userIds = users.map((user) => {
          return user.cmid;
        });
        clients = clients.filter((client) => {
          return userIds.indexOf(client.cm) > -1;
        })

        // Get the conversations that are possible candidates
        return Conversations.findByClientAndUserInvolvingSpecificCommId(clients, communication)
      }).then((resp) => { 
        conversations = resp;

        return Conversations.createNewIfOlderThanSetHours(conversations, 24)
      }).then((resp) => { 
        conversations = resp;

        // We can add this message to existing conversations if they exist
        if (conversations.length > 0) {
          return new Promise((fulfill, reject) => {
            fulfill(conversations);
          })
        } else {
          return Conversations.createNewNOtAcceptedConversationsForAllClients(clients)
        }

      }).then((resp) => {
        conversations = resp;

        let conversationIds = conversations.map((conversation) => {
          return conversation.convid;
        });

        // Now create a number
        return Messages.insertIntoManyConversations(conversationIds,
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