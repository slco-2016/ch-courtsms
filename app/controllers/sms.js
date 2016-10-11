const Communications = require('../models/communications');
const Conversations = require('../models/conversations');
const Departments = require('../models/departments');
const Messages = require('../models/messages');
const SentimentAnalysis = require('../models/sentiment');
const Users = require('../models/users');

const sms = require('../lib/sms');

module.exports = {

  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, '');
    if (fromNumber.length == 10) { 
      fromNumber = '1' + fromNumber; 
    }
    let toNumber = req.body.To.replace(/\D+/g, '');
    if (toNumber.length == 10) { 
      toNumber = '1' + toNumber; 
    }
    const text = req.body.Body.replace(/["']/g, '').trim();
    const MessageStatus = req.body.SmsStatus;
    const MessageSID = req.body.MessageSid;

    // Log IBM Sensitivity measures
    SentimentAnalysis.logIBMSentimentAnalysis(req.body);
    
    let communication, conversations, clients, messages;
    Communications.getOrCreateFromValue(fromNumber, 'cell')
    .then((resp) => {
      communication = resp;
      return sms.retrieveClients(toNumber, communication);
    }).then((resp) => {
      clients = resp;
      return Conversations.retrieveByClientsAndCommunication(
        clients, communication
      );
    }).then((resp) => {
      conversations = resp;
      const conversationIds = conversations.map((conversation) => {
        return conversation.convid;
      });
      
      return Messages.insertIntoManyConversations(conversationIds,
                                                  communication.commid,
                                                  text,
                                                  MessageSID,
                                                  MessageStatus,
                                                  toNumber);
    }).then((resp) => {
      messages = resp;

      // out of office check
      conversations.forEach((conversation) => {
        Users.findById(conversation.cm)
        .then((user) => {
          if (user.is_away) {
            Messages.getLatestNumber(user.cmid, conversation.client)
            .then((commId) => {
              return Messages.sendOne(commId, user.away_message, conversation);
            }).then(() => { }).catch((error) => { console.log(error); });
          }
        });
      });      

      // determine if there is auto-response logic
      conversations.forEach((conversation) => {
        Messages.findByConversation(conversation)
        .then((messages) => {
          return Messages.determineIfAutoResponseShouldBeSent(conversation, messages);
        }).then((resp) => {
          const shouldSendResponse = resp.sendResponse;
          if (shouldSendResponse) {
            const commId = resp.sendValues.communicationId;
            const conversationId = resp.sendValues.conversationId;
            const messageContent = resp.sendValues.content;
            const clientId = conversation.client;
            Conversations.closeAllWithClientExcept(clientId, conversationId)
            .then(() => {
              return Messages.sendOne(commId, messageContent, conversation);
            }).then(() => { }).catch((error) => { console.log(error); });
          }
        }).catch(res.error500);

        req.logActivity.client(conversation.client);
        req.logActivity.conversation(conversation.convid);
      });

      // Send a blank response
      res.send('<?xml version=\'1.0\' encoding=\'UTF-8\'?><Response></Response>');
    });
  },

};