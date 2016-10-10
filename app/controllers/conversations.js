const Clients = require('../models/clients');
const CommConns = require('../models/commConns');
const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const Templates = require('../models/templates');
const Users = require('../models/users');

const moment = require('moment');
const moment_tz = require('moment-timezone');

module.exports = {

  claimOption(req, res) {
    const conversationId = req.params.conversation;
    const clientId = req.params.client;
    Conversations.findByIdsIncludeMessages(conversationId)
    .then((conversations) => {
      conversation = conversations[0];
      if (conversation &&
          conversation.client == Number(clientId) &&
          conversation.cm == req.user.cmid &&
          !conversation.accepted && 
          conversation.open) {
        res.render('capture/conversationClaim', {
          conversation: conversation,
        });
      } else {
        res.notFound();
      }
    }).catch(res.error_500);
  },

  claim(req, res) {
    const conversationId = req.params.conversation;
    const userId = req.user.cmid;
    const clientId = req.params.client;
    const accepted = req.body.accept ? true : false;

    Conversations.makeClaimDecision(conversationId, userId, clientId, accepted)
    .then((conversations) => {
      res.redirect(`/clients/${clientId}/messages`);
    }).catch(res.error_500);
  },

};