const CaptureBoard = require('../models/capture');
const Clients = require('../models/clients');
const Messages = require('../models/messages');
const Users = require('../models/users');

module.exports = {

  index(req, res) {
    const orgId = req.user.org;
    CaptureBoard.findByOrg(orgId)
    .then((conversations) => {
      res.render('capture/index', {
        hub: {
          tab: 'captured',
          sel: null,
        },
        conversations: conversations,
      });
    }).catch(res.error500);
  },

  compose(req, res) {
    const orgId = req.user.org;
    const conversationId = req.params.conversation;

    CaptureBoard.findByConversationId(orgId, conversationId)
    .then((conversation) => {
      if (conversation) {
        res.render('capture/respond', {
          conversation: conversation,
        });
      } else {
        res.notFound();
      }
    }).catch(res.error500);
  },

  submit(req, res) {
    const orgId = req.user.org;
    const conversationId = req.params.conversation;
    const userResponse = req.body.content;
    if (userResponse) {
      CaptureBoard.findByConversationId(orgId, conversationId)
      .then((conversation) => {
        let firstMessage = conversation.msgs[0];
        if (firstMessage && firstMessage.type == 'cell') {
          let conversation = firstMessage.convo;
          let commId = firstMessage.commid;
          Messages.sendTextForUnclaimedConversation(commId, userResponse, conversation)
          .then(() => {
            req.flash('success', 'Message sent successfully.');
            res.redirect(`/org/captured`);
          }).catch(res.error500);          
        } else {
          req.flash('warning', 'Cannot send a message to that device.');
          res.redirect(`/org/captured`);
        }
      }).catch(res.error500);
    } else {
      req.flash('warning', 'No content in the submitted message.');
      res.redirect(`/org/captured/respond/${conversationId}`);
    }
  },

  attachUserIndex(req, res) {
    const orgId = req.user.org;
    const conversationId = req.params.conversation;
    let departmentFilter = null;
    if (req.user.class === 'supervisor') { 
      departmentFilter = req.user.department; 
    }

    CaptureBoard.findByConversationId(orgId, conversationId)
    .then((conversation) => {
      if (conversation) {

        Users.findByOrg(orgId)
        .then((users) => {
          if (departmentFilter) {
            users = users.filter((u) => { return u.department == departmentFilter; });
          }

          res.render('capture/attachUser', {
            conversation: conversation,
            users: users,
          });
        }).catch(res.error500);

      } else {
        res.notFound();
      }
    }).catch(res.error500);
  },

  attachUserSelect(req, res) {
    const targetUser = req.body.user;
    const conversationId = req.params.conversation;
    if (targetUser) {
      res.redirect(`/org/captured/attach/${conversationId}/user/${targetUser}`);
    } else {
      res.notFound();
    }
  },

  attachClientIndex(req, res) {
    const orgId = req.user.org;
    const targetUser = req.params.user;
    const conversationId = req.params.conversation;

    CaptureBoard.findByConversationId(orgId, conversationId)
    .then((conversation) => {
      if (conversation) {

        Clients.findByUsers([targetUser,], true)
        .then((clients) => {
          if (clients.length) {
            res.render('capture/attachClient', {
              conversation: conversation,
              clients: clients,
            });
          } else {
            req.flash('warning', 'That user has no active clients in their case load.');
            res.redirect(`/org/captured/attach/${conversationId}`);
          }
        }).catch(res.error500);

      } else {
        res.notFound();
      }
    }).catch(res.error500);

  },

  attachUpdate(req, res) {
    const orgId = req.user.org;
    const client = req.body.client;
    const targetUser = req.params.user;
    const conversationId = req.params.conversation;

    if (targetUser && client) {
      CaptureBoard.findByConversationId(orgId, conversationId)
      .then((conversation) => {
        if (conversation) {
          CaptureBoard.associateConversation(targetUser, client, conversationId)
          .then(() => {
            req.flash('success', 'Captured conversation and added related communication method.');
            res.redirect('/org/captured');
          }).catch(res.error500);
        } else {
          res.notFound();
        }
      }).catch(res.error500);
    } else {
      req.flash('warning', 'Could not identify that user or client, please try again.');
      res.redirect(`/org/captured/attach/${conversationId}`);
    }
  },

  removeConfirm(req, res) {
    const conversationId = req.params.conversation;
    const orgId = req.user.org;
    CaptureBoard.findByConversationId(orgId, conversationId)
    .then((conversation) => {
      if (conversation) {
        res.render('capture/removeConfirm', {
          conversation: conversation,
        });
      } else {
        res.notFound();
      }
    }).catch(res.error500);
  },

  remove(req, res) {
    const conversationId = Number(req.params.conversation);

    CaptureBoard.removeOne(conversationId)
    .then(() => {
      req.flash('success', 'Removed a captured conversation.');
      res.redirect('/org/captured');
    }).catch(res.error500);
  },

};