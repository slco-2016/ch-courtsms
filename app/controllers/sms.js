const Communications = require("../models/communications");
const Conversations = require('../models/conversations');
const Departments = require("../models/departments");
const Messages = require("../models/messages");
const SentimentAnalysis = require('../models/sentiment');

const sms = require('../lib/sms');

module.exports = {

  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, "");
    if (fromNumber.length == 10) { 
      fromNumber = "1" + fromNumber; 
    }
    let toNumber = req.body.To.replace(/\D+/g, "");
    if (toNumber.length == 10) { 
      toNumber = "1" + toNumber; 
    }
    let text = req.body.Body.replace(/["']/g, "").trim();
    let MessageStatus = req.body.SmsStatus;
    let MessageSID = req.body.MessageSid;

    // Log IBM Sensitivity measures
    SentimentAnalysis.logIBMSentimentAnalysis(req.body);
    
    let communication, conversations, clients;
    Communications.getOrCreateFromValue(fromNumber, "cell")
    .then((resp) => {
      communication = resp;
      return sms.retrieveClients(toNumber, communication);
    }).then((resp) => {
      clients = resp;
      return Conversations.retrieveByClientsAndCommunication(
        clients, communication
      )
    }).then((resp) => {
      conversations = resp;
      let conversationIds = conversations.map((conversation) => {
        return conversation.convid;
      });
      
      return Messages.insertIntoManyConversations(conversationIds,
                                                  communication.commid,
                                                  text,
                                                  MessageSID,
                                                  MessageStatus,
                                                  toNumber);
    }).then((messages) => {

      conversations.forEach((conversation) => {
        Messages.findByConversation(conversation)
        .then((messages) => {
          return Messages.determineIfAutoResponseShouldBeSent(conversation, messages)
        }).then((resp) => {
          let shouldSendResponse = resp.sendResponse;
          if (shouldSendResponse) {
            let commId = resp.sendValues.communicationId;
            let conversationId = resp.sendValues.conversationId;
            let messageContent = resp.sendValues.content;
            let clientId = conversation.client;
            Conversations.closeAllWithClientExcept(clientId, conversationId)
            .then(() => {
              return Messages.sendOne(commId, messageContent, conversation)
            }).then(() => { }).catch((error) => {
              console.log(error);
            });
          }
        }).catch((err) => {
          console.log("Error finding by conversation: ", err);
        });

        req.logActivity.client(conversation.client)
        req.logActivity.conversation(conversation.convid);
      });

      // Send a blank response
      res.send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>");
    });
  },

};