const CaptureBoard = require('../models/capture');


module.exports = {

  index(req, res) {
    let orgId = req.user.org;
    CaptureBoard.findByOrg(orgId)
    .then((conversations) => {
      res.render("capture/index", {
        conversations: conversations
      });
    }).catch(res.error500);
  }

}