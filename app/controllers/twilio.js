const Twilio = require('../models/twilio');
const Conversations = require('../models/conversations');
const SentimentAnalysis = require('../models/sentiment');

module.exports = {

  receiveText(req, res) {
    // Send a blank response before proceeding with logic
    res.send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>");

    let fromNumber = from.replace(/\D+/g, "");
    if (fromNumber.length == 10) { 
      from = "1" + from; 
    }
    let text = req.body.Body.replace(/["']/g, "").trim();
    let MessageStatus = req.body.SmsStatus;
    let MessageSID = req.body.MessageSid;

    // Log IBM Sensitivity measures
    SentimentAnalysis.logIBMSentimentAnalysis(req.body);
    
    Twilio.processIncoming(fromNumber, text, MessageStatus, MessageSID)
    .then((conversations) => {

      let conversationIds = conversations.map((conversation) => {
        return conversation.convid;
      });

      Conversations.findByIds(conversationIds)
    }).then((conversations) => {

      conversations.forEach((conversation) => {
        let content;
        let commId = conversation.message.comm;
        let conversationId = conversation.convid;
        let inboundMessages = conversation.messages.filter((message) => {
          return message.inbound;
        });
        let outboundMessages = conversation.messages.filter((message) => {
          return !message.inbound;
        });

        if (conversation.clid == null) {
          // This is a new conversation that has been started from unknown number
          if (inboundMessages.length == 1) {
            content = `Sorry! This # is not registered; 
                      Help us find you. Reply with your name 
                      in the following format: FIRST M LAST.`;
          } else {
            content = `Thanks for the message. A support member
                      will place this number with the correct
                      case manager as soon as possible.`;
          }

        } else if (inboundMessages.length > 1) {
            let lastInboundDate = inboundMessages[inboundMessages.length - 1].created;
            let d1 = new Date(lastInboundDate);
            let d2 = new Date();
            let timeLapsed = Math.round((d2.getTime() - d1.getTime()) / (3600*1000));

            // If it's been more than 4 hours let's communicate
            if (timeLapsed > 1) {
              let dayOfWeek = d2.getDay();
              if (dayOfWeek == 0 || dayOfWeek == 6) {
                content = `Message received. Because it 
                          is the weekend, your case manager may not 
                          be able to response immediately. Thanks 
                          for your patience.`;
              } else {
                content = `Message received. As it has been over ${timeLapsed} 
                          hours and your case manager has not yet 
                          addressed your prior message, a reminder
                          has been sent out. Thanks for your patience.`;
              }
            }
          }
          if (content) {
            Messages.sendOne(commId, content, conversationId)
            .then(() => { }).catch((error) => {
              console.log(error);
            });
          }
        }
      });
  },

  receiveVoice(req, res) {
    res.send(`<?xml version='1.0' encoding='UTF-8'?>
              <Response>
                <Say voice='woman'>
                  Client Comm is a text only number currently. 
                  Please dial 385-468-3500 for the front desk and ask for your case manager.
                </Say>
              </Response>`);
  },

};