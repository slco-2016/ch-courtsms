



router.get("/communications/remove/:communicationID", (req, res) => {
  CommConns.findByClientIdWithCommMetaData(req.params.clientID)
  .then((commConns) => {
    if (commConns.length > 1) {
      Communications.removeOne(req.params.communicationID)
      .then((communications) => {
        req.flash("success", "Removed communication method.");
        res.redirect(`${res.redirectUrlBase}/clients/client/${req.params.clientID}/communications`);
      }).catch(error500(res));
    } else {
      req.flash("warning", "Can't remove the only remaining communication method.");
      res.redirect(`${res.redirectUrlBase}/clients/client/${req.params.clientID}/communications`);
    }
  })
});


router.get("/communications/create", (req, res) => {
  res.render("v4/primaryUser/client/createComm", {
    commConn: {}
  });
});


router.post("/communications/create", (req, res) => {

});


// EXPORT ROUTER OBJECt
module.exports = router;



