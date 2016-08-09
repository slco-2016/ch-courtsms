


// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router({mergeParams: true});

// DB via knex.js to run queries
var db  = require("../../server/db");

// UTILITIES
var utils = require("../../utils/utils.js");

// Datetime management
var moment = require("moment");
var moment_tz = require("moment-timezone");

// Error handling
var errorHandlers = utils["errorHandlers"];
var fivehundred   = errorHandlers.fivehundred;


// Checks to see if there are new messages in any conversations
// Returns a boolean value
router.get("/", function (req, res) {
  var errorRedirect = fivehundred(res);

  var cmid = Number(req.user.cmid);

  // Makes sure necessary values are integers
  if (isNaN(cmid)) {
    res.redirect("/404");

  } else {
    db("msgs")
    .count("msgid")
    .leftJoin("convos", "msgs.convo", "convos.convid")
    .where("msgs.read", false)
    .andWhere("convos.cm", cmid)
    .then(function (clients) {
      var totalNewMessages = 0;

      // See if there are any new messages in any of the conversations
      clients.forEach(function (ea) {
        var newMessages = Number(ea.count);
        if (!isNaN(newMessages)) {
          totalNewMessages += newMessages;
        }
      });

      res.send({newMessages: totalNewMessages > 0});

    }).catch(errorRedirect);
  }
});


// Checks to see if there are new messages in a specific conversation
// Returns a boolean value
router.get("/convos/:convid", function (req, res) {
  var errorRedirect = fivehundred(res);
  var convid = Number(req.params.convid);

  // If convid is not a number, then can't query
  if (isNaN(convid)) {
    res.redirect("/404");

  } else {
    db("msgs")
    .count("msgid")
    .where("convo", convid)
    .andWhere("read", false)
    .then(function (msgsCount) {
      msgsCount = Number(msgsCount.count);
      if (isNaN(msgsCount)) {
        msgsCount = 0;
      }
      res.send({
        newMessages: msgsCount > 0
      });
    })
    .catch(errorRedirect);
  }
});



// EXPORT ROUTER OBJECt
module.exports = router;

















