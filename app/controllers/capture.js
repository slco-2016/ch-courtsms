const CaptureBoard = require('../models/capture');
const Users = require('../models/users');

module.exports = {

  index(req, res) {
    let orgId = req.user.org;
    CaptureBoard.findByOrg(orgId)
    .then((conversations) => {
      res.render("capture/index", {
        hub: {
          tab: "captured",
          sel: null
        },
        conversations: conversations
      });
    }).catch(res.error500);
  },

  attachIndex(req, res) {
    let orgId = req.user.org;
    let conversationId = Number(req.params.conversation);
    let departmentFilter = null;
    if (req.user.class === "supervisor") { 
      departmentFilter = req.user.department; 
    }

    CaptureBoard.findByConversationId(orgId, conversationId)
    .then((conversation) => {
      if (conversation) {

        Users.findByOrg(orgId)
        .then((users) => {
          if (departmentFilter) {
            users = users.filter((u) => { return u.department == departmentFilter });
          }

          res.render("capture/attach", {
            conversation: conversation,
            users: users
          });
        }).catch(res.error500);

      } else {
        res.notFound();
      }
    }).catch(res.error500);
  },

  attachUpdate(req, res) {
    let targetUser = req.body.user;
    let conversationId = req.params.conversation;
    if (targetUser) {
      CaptureBoard.findByConversationId(conversationId)
      .then((conversation) => {
        if (conversation) {
          
        } else {
          res.notFound();
        }
      }).catch(res.error500);
    } else {
      req.flash("warning", "Could not identify that user, please select another.");
      res.redirect(`/org/captured/attach/${conversationId}`);
    }
  },

  removeConfirm(req, res) {
    let conversationId = Number(req.params.conversation);
    CaptureBoard.findByConversationId(conversationId)
    .then((conversation) => {
      if (conversation) {
        res.render("capture/removeConfirm", {
          conversation: conversation
        });
      } else {
        res.notFound();
      }
    }).catch(res.error500);
  },

  remove(req, res) {
    let conversationId = Number(req.params.conversation);

    CaptureBoard.removeOne(conversationId)
    .then(() => {
      req.flash("success", "Removed a captured conversation.");
      res.redirect(`/org/captured`);
    }).catch(res.error500);
  }

}