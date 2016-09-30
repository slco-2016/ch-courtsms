const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const SentimentAnalysis = require('../models/sentiment');
const sms = require('../lib/sms');

module.exports = {

  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, "");
    if (fromNumber.length == 10) { 
      from = "1" + from; 
    }
    let toNumber = req.body.To.replace(/\D+/g, "");
    if (toNumber.length == 10) { 
      from = "1" + from; 
    }
    let text = req.body.Body.replace(/["']/g, "").trim();
    let MessageStatus = req.body.SmsStatus;
    let MessageSID = req.body.MessageSid;

    // Log IBM Sensitivity measures
    SentimentAnalysis.logIBMSentimentAnalysis(req.body);
    
    sms.processIncomingAndRetrieveOrCreateConversations(toNumber, 
                                                        fromNumber, 
                                                        text, 
                                                        MessageStatus, 
                                                        MessageSID)
    .then((conversations) => {

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
            Messages.sendOne(commId, messageContent, conversationId)
            .then(() => { }).catch((error) => {
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