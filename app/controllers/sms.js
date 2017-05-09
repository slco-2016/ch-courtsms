const twilio = require('twilio');
const Communications = require('../models/communications');
const Conversations = require('../models/conversations');
const Departments = require('../models/departments');
const Messages = require('../models/messages');
const SentimentAnalysis = require('../models/sentiment');
const Users = require('../models/users');
const colors = require('colors');

const sms = require('../lib/sms');
const analyticsService = require('../lib/analytics-service');

const credentials = require('../../credentials');

module.exports = {
  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, '');
    if (fromNumber.length == 10) {
      fromNumber = `1${fromNumber}`;
    }
    let toNumber = req.body.To.replace(/\D+/g, '');
    if (toNumber.length == 10) {
      toNumber = `1${toNumber}`;
    }
    const text = req.body.Body.replace(/["']/g, '').trim();
    const MessageStatus = req.body.SmsStatus;
    const MessageSID = req.body.MessageSid;

    // validateRequest returns true if the request originated from Twilio
    // TODO: Is there a better way than manually setting the protocol to https?
    const opts = { protocol: 'https' };
    // NOTE: We may need to add our own host because a port number gets added
    //       to the host during tests, which causes tests to fail because the
    //       Twilio signature we've baked into the tests doesn't match.
    let validationPasses = twilio.validateExpressRequest(
      req,
      credentials.authToken,
      opts
    );

    // TODO: should mock validation passing in tests instead of doing this here
    if (!validationPasses && credentials.CCENV == 'testing') {
      validationPasses = true;
      console.log('Letting tests pass even though validation has failed!'.red);
    }

    if (validationPasses) {
      // Log IBM Sensitivity measures
      SentimentAnalysis.logIBMSentimentAnalysis(req.body);

      let communication, conversations, clients, messages;
      Communications.getOrCreateFromValue(fromNumber, 'cell')
        .then(resp => {
          communication = resp;
          return sms.retrieveClients(toNumber, communication);
        })
        .then(resp => {
          clients = resp;
          return Conversations.retrieveByClientsAndCommunication(
            clients,
            communication
          );
        })
        .then(resp => {
          conversations = resp;
          const conversationIds = conversations.map(
            conversation => conversation.convid
          );

          return Messages.insertIntoManyConversations(
            conversationIds,
            communication.commid,
            text,
            MessageSID,
            MessageStatus,
            toNumber
          );
        })
        .then(resp => {
          messages = resp;

          // out of office check
          conversations.forEach(conversation => {
            Users.findById(conversation.cm).then(user => {
              if (user && user.is_away) {
                Messages.getLatestNumber(user.cmid, conversation.client)
                  .then(commId => {
                    const awayMessage =
                      user.away_message ||
                      'I am currently out of office. I will respond as soon as possible.';
                    return Messages.sendOne(commId, awayMessage, conversation);
                  })
                  .then(() => {})
                  .catch(error => {
                    console.log(error);
                  });
              }
            });
          });

          // determine if there is auto-response logic
          conversations.forEach(conversation => {
            Messages.findByConversation(conversation)
              .then(messages =>
                Messages.determineIfAutoResponseShouldBeSent(
                  conversation,
                  messages
                )
              )
              .then(resp => {
                const shouldSendResponse = resp.sendResponse;
                if (shouldSendResponse) {
                  const commId = resp.sendValues.communicationId;
                  const conversationId = resp.sendValues.conversationId;
                  const messageContent = resp.sendValues.content;
                  const clientId = conversation.client;
                  Conversations.closeAllWithClientExcept(
                    clientId,
                    conversationId
                  )
                    .then(() =>
                      Messages.sendOne(commId, messageContent, conversation)
                    )
                    .then(() => {})
                    .catch(error => {
                      console.log(error);
                    });
                }
              })
              .catch(res.error500);

            req.logActivity.client(conversation.client);
            req.logActivity.conversation(conversation.convid);

            // track the message
            const methodExisted = (conversation.client) ? true : false;
            analyticsService.track(null, 'message_receive', req, res.locals, {
              ccc_id: conversation.client,
              message_medium: 'text',
              message_length: text.length,
              contact_method_description: communication.description,
              contact_method_existed: methodExisted,
            });
          });

          // Send a blank response
          const twilioResponse = new twilio.TwimlResponse();
          res.send(twilioResponse.toString());
        });
    } else {
      res.status(403).send('You are not Twilio. Buzz off.');
    }
  },
};
