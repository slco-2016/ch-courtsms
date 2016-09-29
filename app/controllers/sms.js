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
    
    sms.processIncoming(toNumber, fromNumber, text, MessageStatus, MessageSID)
    .then((conversations) => {

      let conversationIds = conversations.map((conversation) => {
        return conversation.convid;
      });

      return Conversations.findByIds(conversationIds)
    }).then((resp) => {

      resp.forEach((conversation) => {
        let content;
        let commId = conversation.messages[0].comm;
        let conversationId = conversation.convid;
        let inboundMessages = conversation.messages.filter((message) => {
          return message.inbound;
        });
        let outboundMessages = conversation.messages.filter((message) => {
          return !message.inbound;
        });

        if (conversation.client == null) {
          // This is a new conversation that has been started from unknown number
          if (inboundMessages.length == 1) {
            content = `Sorry! This # is not registered; Help us find you. Reply with your name in the following format: FIRST M LAST.`;
          } else {
            content = `Thanks for the message. A support member will place this number with the correct case manager as soon as possible.`;
          }

        } else if (inboundMessages.length > 1) {
            let lastInboundDate = inboundMessages[inboundMessages.length - 1].created;
            let d1 = new Date(lastInboundDate).getTime();
            let d2 = new Date().getTime();
            let timeLapsed = Math.round((d2 - d1) / (3600*1000));

            // If it's been more than 1 hour let's communicate
            if (timeLapsed > 1) {
              let dayOfWeek = d2.getDay();
              if (dayOfWeek == 0 || dayOfWeek == 6) {
                content = `Message received. Because it is the weekend, your case manager may not be able to response immediately. Thanks for your patience.`;
              } else {
                content = `Message received. As it has been over ${timeLapsed} hours and your case manager has not yet addressed your prior message, a reminder has been sent out. Thanks for your patience.`;
              }
            }
          }
          if (content) {
            // Switch to only send when app is in production
            if (process.env.CCENV !== "testing") {
              Messages.sendOne(commId, content, conversationId)
              .then(() => { }).catch((error) => {
                console.log(error);
              });
            }
          }

          req.logActivity.client(conversation.client)
          req.logActivity.conversation(conversationId);
        });

        // Send a blank response
        res.send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>");
      });
  },

};