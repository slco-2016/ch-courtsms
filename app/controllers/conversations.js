const Clients = require('../models/clients');
const CommConns = require('../models/commConns');
const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const Templates = require('../models/templates');
const Users = require('../models/users');

let moment = require("moment");
let moment_tz = require("moment-timezone");

module.exports = {

  claimOption(req, res) {
    let conversationId = req.params.conversation;
    let clientId = req.params.client;
    Conversations.findById(conversationId)
    .then((conversation) => {
      if (conversation &&
          conversation.client == Number(clientId) &&
          conversation.cm == req.user.cmid &&
          !conversation.accepted && 
          conversation.open) {
        res.render('capture/conversationClaim', {
          conversation: conversation
        });
      } else {
        res.notFound();
      }
    }).catch(res.error_500);
  },

  claim(req, res) {
    let conversationId = req.params.conversation;
    let userId = req.user.cmid;
    let clientId = req.params.client;
    let accepted = req.body.accept ? true : false;

    Conversations.makeClaimDecision(conversationId, userId, clientId, accepted)
    .then((conversations) => {
      res.redirect(`/clients/${clientId}/messages`)
    }).catch(res.error_500);
  }

};