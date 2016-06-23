


// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router();

// DB via knex.js to run queries
var db  = require("../../server/db");



// GENERATE CAPTURE BOARD
// TO DO: Need to make this organization-specific
router.get("/", function (req, res) { 
  var rawQuery = "  SELECT * FROM msgs " +
                  " JOIN convos ON (msgs.convo = convos.convid) " +
                  " JOIN comms ON (comms.commid = msgs.comm) " +
                  " WHERE convos.client IS NULL " + 
                  " AND convos.open = TRUE " +
                  " ORDER BY msgs.created ASC;";
  
  db.raw(rawQuery).then(function (floaters) {

    // Reduce results to just convids, and sort incrementally
    var convos = floaters.rows.map(function (ea) { return ea.convo; }).reduce(function (a,b) { 
      if (a.indexOf(b) < 0) a.push(b);
      return a;
    },[]).map(function (ea) { return {convo: ea, msgs: []}; });

    // Add messages to each identified convo obj
    floaters.rows.forEach(function (ea) { 
      for (var i = 0; i < convos.length; i++) {
        if (convos[i].convo == ea.convo) convos[i].msgs.push(ea);
      }
    });

    res.render("captureboard/capture", {convos: convos});

  }).catch(function (err) { res.redirect("/500"); });
});



// BRING UP CAPTURE CARD FOR SPECIFIC UNCLAIMED CONVERSATION
router.get("/:convid", function (req, res) { 
  var convid = Number(req.params.convid);

  // Make sure convid is a number
  if (isNaN(convid)) { res.redirect("/400"); }
  else {
    var rawQuery = "SELECT * FROM convos WHERE convos.client IS NULL AND convos.convid = " + String(convid) + " LIMIT 1;";
    
    db.raw(rawQuery).then(function (convos) {
      if (convos.rows.length !== 1) { res.redirect("/404"); }
      else {

        db("clients").where("clients.cm", req.user.cmid).andWhere("clients.active", true)
        .then(function (clients) {
          res.render("captureboard/capturecard", {convo: convos.rows[0], clients: clients});
        }).catch(function (err) { res.redirect("/500"); });

      }
    }).catch(function (err) { res.redirect("/500"); });
  }
});



// SUBMIT CONVO CAPTURE
router.post("/:convid", function (req, res) { 

  // Make sure all vars that are supposed to be numbers are indeed numbers
  var cmid   = req.body.cmid && !isNaN(req.body.cmid) ? Number(req.body.cmid) : null;
  var clid   = req.body.clid && !isNaN(req.body.clid) ? Number(req.body.clid) : null;
  var convid = req.body.convid && !isNaN(req.body.convid) ? Number(req.body.convid) : null;

  // Check that text strings are sufficient
  var subject    = req.body.subject && typeof req.body.subject == "string" && req.body.subject.length > 0 ? req.body.subject.trim() : null;
  var devicename = req.body.device && typeof req.body.device == "string" && req.body.device.length > 0 ? req.body.device.trim() : null;

  // Default redirect is set to main capture screen  
  var redirect_loc = "/capture";
  var reroute = "/cms/" + String(cmid) + "/cls/" + String(clid) + "/convos/" + String(convid);

  // Check to make sure all POST body variables are okay
  var variableAllClear = subject && cmid && clid && convid && devicename;
  if (!variableAllClear) {
    req.flash("warning", "Incorrectly formatted POST body components from capture card submission.");
    res.redirect(redirect_loc);

  // Proceed if they are and run PgSQL queries
  } else {

    var rawQuery =  " PREPARE convocapture (text, int, int, int) AS " +
                    "   UPDATE convos SET subject = $1, cm = $2, client = $3, accepted = TRUE, open = TRUE " + 
                    "   WHERE convid = $4 AND client IS NULL; " +
                    " EXECUTE convocapture('" + subject + "', " + cmid + ", " + clid + ", " + convid + ");";
    
    // Query 1: Update convo with CM and client
    db.raw(rawQuery).then(function (success) {

    // Query 2: Close all other conversation that client has open
    db("convos")
    .whereNot("convid", convid)
    .andWhere("cm", cmid)
    .andWhere("client", clid)
    .update({ open: false })
    .then(function (success) {

    // Query 3: Gather comm forms used in that conversation (should be only one)
    db("msgs")
    .where("convo", convid)
    .andWhere("inbound", true)
    .pluck("comm")
    .then(function (comms) {

    // Query 4: Gather comms that the CM currently has
    db("commconns")
    .where("client", clid)
    .andWhere("retired", null)
    .pluck("comm")
    .then(function (clientcomms) {

      // Remove duplicates
      comms = comms.reduce(function (a,b) { 
        if (a.indexOf(b) < 0 ) a.push(b);
        return a;
      },[]);

      // Filter so you only have new comms that CM does not have captured yet
      comms = comms.filter(function (comm) { return clientcomms.indexOf(comm) == -1; });

      // Prepare a list of new clientcomm objects
      var insertList = [];
      comms.forEach(function (comm, i) {

        // If there is more than one commconn being added, name the second ones automatically
        // TO DO: We need them to be able to name all comm methods in POST (if common)
        var name = i == 0 ? devicename : devicename + "_num_" + String(i + 1);
        
        insertList.push({
          client: clid,
          comm: comm,
          name: name
        });
      });

      // Run query only if there is stuff to enter
      if (insertList.length > 0) {

        // Query 5: Insert the new commconns
        db("commconns").insert(insertList).then(function (success) {
          req.flash("success", "Captured conversation and added new communication methods.");
          res.redirect(reroute);
        }).catch(function (err) { res.redirect("/500"); }); // Query 5
      
      } else {
        req.flash("success", "Captured conversation.");
        res.redirect(reroute);
      }

    }).catch(function (err) { res.redirect("/500"); }); // Query 4
    }).catch(function (err) { res.redirect("/500"); }); // Query 3
    }).catch(function (err) { res.redirect("/500"); }); // Query 2
    }).catch(function (err) { res.redirect("/500"); }); // Query 1

  }
});



// EXPORT ROUTER OBJECt
module.exports = router;



