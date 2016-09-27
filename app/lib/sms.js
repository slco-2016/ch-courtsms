'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

const Clients = require("../models/clients");
const Conversations = require("../models/conversations");
const Communications = require("../models/communications");
const Messages = require("../models/messages");

module.exports = {

  processIncoming (fromNumber, text, MessageStatus, MessageSID) {
    let communication, conversations;
    return new Promise ((fulfill, reject) => {
      Communications.getOrCreateFromValue(fromNumber, "cell")
      .then((resp) => {
        communication = resp;
        return Clients.findByCommId(communication.id);
      }).then((clients) => {
        return Conversations.findOrCreate(clients, communication.commid);
      }).then((resp) => {
        conversations = resp;
        let conversationIds = conversations.map((conversation) => {
          return conversation.convid;
        });
        return Messages.createMany( conversationIds,
                                    communication.commid,
                                    text,
                                    MessageSID,
                                    MessageStatus);
      }).then((messages) => {
        conversations = conversations.map((conversation) => {
          messages.forEach((message) => {
            if (message.convo == conversation.convid) {
              conversation.messages = message;
            }
          });
          return conversation;
        });
        fulfill(conversations);
      }).catch(reject);
    });
  }

};