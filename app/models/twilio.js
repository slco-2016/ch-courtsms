'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

const Clients = require("./clients");
const Conversations = require("./conversations");
const Communications = require("./communications");
const Messages = require("./messages");

class Twilio {

  static processIncoming (fromNumber, text, MessageStatus, MessageSID) {
    let communication, conversations;
    return new Promise ((fulfill, reject) => {
      Communications.getOrCreateFromValue(fromNumber, "cell")
      .then((comm) => {
        communication = comm;
        return Clients.findByCommId(comm.id);
      }).then((clients) => {
        return Conversations.findOrCreate(clients, communication.commid);
      }).then((convos) => {
        conversations = convos;
        let conversationIds = convos.map((conversation) => {
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

}

module.exports = Twilio;