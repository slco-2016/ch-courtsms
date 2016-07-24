


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

  var cmid = Number(req.params.cmid);

  // Makes sure necessary values are integers
  if (isNaN(cmid)) {
    res.redirect("/404");

  } else {
    // Warning: This is also used when querying for all clients view
    // TO DO: Consolidate into a single function, make DRY
    var rawQuery = " SELECT " +
                    "   count(CASE WHEN msgs.read=FALSE THEN 1 ELSE NULL END) AS msg_ct, " +
                    "   convos.open, convos.subject, convos.convid, " +
                    "   clients.*  " +
                    " FROM clients " + 
                    " LEFT JOIN (SELECT * FROM convos WHERE convos.updated IN (SELECT MAX(convos.updated) FROM convos WHERE cm = " + String(cmid) + 
                    "     GROUP BY client) " + 
                    "     AND cm = " + String(cmid) + ") AS convos " + 
                    "     ON (convos.client=clients.clid) " +
                    " LEFT JOIN msgs ON (msgs.convo=convos.convid) " +
                    " WHERE clients.cm = " + String(cmid) + " " +
                    " GROUP BY clients.clid, convos.open, convos.subject, convos.convid ORDER BY last ASC; ";

    db.raw(rawQuery).then(function (clients) {
      var totalNewMessages = 0;

      // See if there are any new messages in any of the conversations
      clients.rows.forEach(function (ea) {
        var newMessages = Number(ea.msg_ct);
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

















