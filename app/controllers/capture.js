const CaptureBoard = require('../models/capture');


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

  removeConfirm(req, res) {
    let orgId = req.user.org;
    let conversationId = Number(req.params.conversation);
    CaptureBoard.findByOrg(orgId)
    .then((conversations) => {
      let conversation = conversations.filter((convo) => {
        return conversationId == convo.convo;
      })[0];
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