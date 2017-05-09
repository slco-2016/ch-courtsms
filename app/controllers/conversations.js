const Clients = require('../models/clients');
const CommConns = require('../models/commConns');
const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const Templates = require('../models/templates');
const Users = require('../models/users');
const analyticsService = require('../lib/analytics-service');
const moment = require('moment');
const momentTz = require('moment-timezone');

module.exports = {
  claimOption(req, res) {
    const conversationId = req.params.conversation;
    const clientId = req.params.client;

    Conversations.findByIdsIncludeMessages(conversationId)
      .then(conversations => {
        conversation = conversations[0];
        if (
          conversation &&
          conversation.client == Number(clientId) &&
          conversation.cm == req.user.cmid &&
          !conversation.accepted &&
          conversation.open
        ) {
          analyticsService.track(
            null,
            'convo_conflict_alert',
            req,
            res.locals,
            {
              ccc_id: clientId,
              ccc_active: res.locals.client.active,
              messages_all_count: conversation.messages.length,
              messages_all_ids: conversation.messages
                .map(m => m.msgid)
                .join(','),
            }
          );

          res.render('capture/conversationClaim', {
            conversation,
          });
        } else {
          res.notFound();
        }
      })
      .catch(res.error_500);
  },

  claim(req, res) {
    const conversationId = req.params.conversation;
    const userId = req.user.cmid;
    const clientId = req.params.client;
    const accepted = !!req.body.accept;
    const label = accepted ? 'convo_conflict_accept' : 'convo_conflict_reject';

    Conversations.makeClaimDecision(conversationId, userId, clientId, accepted)
      .then(conversation => {
        analyticsService.track(null, label, req, res.locals, {
          ccc_id: clientId,
          ccc_active: res.locals.client.active,
        });

        res.redirect(`/clients/${clientId}/messages`);
      })
      .catch(res.error_500);
  },
};
