


// SECRET STUFF
var credentials = require("../../credentials");
var ACCOUNT_SID = credentials.accountSid;
var AUTH_TOKEN = credentials.authToken;
var TWILIO_NUM = credentials.twilioNum;


// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router({mergeParams: true});

// DB via knex.js to run queries
var db  = require("../../app/db");

// Twilio tools
var twilio = require("twilio");
var twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

// UTILITIES
var utils = require("../../utils/utils.js");

// Models
const Convo = require('../../models/models').Convo
const Message = require('../../models/models').Message
const Communication = require('../../models/models').Communication

// Query tools
var sms = utils["sms"];
var cmview = utils["cmview"];

// Session status control
var auth = utils["pass"];

// Error handling
var errorHandlers = utils["errorHandlers"];
var fivehundred   = errorHandlers.fivehundred;



// Set elements we will always check for in these routes, such as client
router.use(function (req, res, next){  
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Param variables
  var cmid = Number(req.params.cmid);
  var clid = Number(req.params.clid);

  // Error if either id is not an integer
  if (isNaN(cmid) || isNaN(clid)) {
    notFound(res); 

  // Search away
  } else {
    db("clients")
    .where("cm", cmid)
    .andWhere("clid", clid)
    .then(function (clients) {

      // Make sure that client with that cm actually exists
      if (clients.length == 0) { 
        notFound(res); 

      // Then proceed to gather current conversations
      } else { 
        res.locals.client = clients[0]; 
        next();
      }
    }).catch(errorRedirect);
  }
});


// START LOGIC FOR CREATING A NEW CONVERSATION
// Send to /new endpoint
router.get("/", function (req, res) {
  // Param variables
  var cmid = Number(req.params.cmid);
  var clid = Number(req.params.clid);
  // Reroute to first step of creating new conversation
  var redirectLoc = "/cms/" + cmid + "/cls/" + clid + "/convos/new";
  res.redirect(redirectLoc);
});


// Route to first step in /new process
router.get("/new", function (req, res) {
  // Param variables
  var cmid = Number(req.params.cmid);
  var clid = Number(req.params.clid);
  // Reroute to first step of creating new conversation
  var redirectLoc = "/cms/" + cmid + "/cls/" + clid + "/convos/new/selectpath";
  res.redirect(redirectLoc);
});


// First step in making new convo message
router.get("/new/selectpath", function (req, res) { 
  res.render("casemanagers/client/newconversation/selectpath");
});


// Optional step in making new convo message
// Choose a template to use
router.get("/new/selecttemplate", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Param variables
  var cmid = Number(req.params.cmid);
  var clid = Number(req.params.clid);

  db("templates")
  // Either this is an active org template
  .where("org", req.user.org)
  .andWhere("casemanager", null)
  .andWhere("templates.active", true)
  
  // ... or an active case manager template
  .orWhere("casemanager", req.user.cmid)
  .andWhere("templates.active", true)
  
  .orderByRaw("updated DESC")
  .then(function (templates) {

    var templateIDs = templates.map(function (ea) {
      return ea.template_id;
    });

    // TO DO: Combine with above DB query
    // This should really be part of the above database query, not a second operation
    db("template_use")
    .count("template_use_id")
    .whereIn("template", templateIDs)
    .groupBy("template")
    .then(function (template_use) {

      // Add counts to each template
      templates = templates.map(function (eaTemp) {
        // Minimum count would be zero
        var totalUse = 0;
        // Iterate through used template counts and update
        template_use.forEach(function (eaUse) {
          if (eaUse.template == eaTemp.template_id) {
            totalUse = eaUse.count;
          }
        });
        // Figure out how to handle difference in camelcase v. Postgres data
        eaTemp.times_used = totalUse;
        return eaTemp;
      });

      res.render("casemanagers/client/newconversation/selecttemplate", {
        templates: templates
      });

    }).catch(errorRedirect);  
  }).catch(errorRedirect);
});

// Submit template selection to use in new convo message
router.post("/new/selecttemplate", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Param variables
  var cmid = Number(req.params.cmid);
  var clid = Number(req.params.clid);

  var templateID = Number(req.body.templateID);

  // Make sure a valid template has been submitted
  if (isNaN(templateID)) {
    notFound(res); 

  // If it has, re-query for its contents
  } else {
    db("templates")
    .where("template_id", templateID)
    .limit(1)
    .then(function (templates) {

      // Make sure there is a valid response
      if (templates.length == 0) {
        notFound(res); 

      } else {
        db("comms")
        .innerJoin("commconns", "comms.commid", "commconns.comm")
        .where("commconns.client", clid)
        .then(function (comms) {

          res.render("casemanagers/client/newconversation/createmessage", {
            template: templates[0],
            comms: comms
          });
          
        }).catch(errorRedirect);
      }

    }).catch(errorRedirect); 
  }
});


// Alternative straight to free text box option
router.get("/new/craftmessage", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Param variables
  var cmid = Number(req.params.cmid);
  var clid = Number(req.params.clid);

  db("comms")
  .innerJoin("commconns", "comms.commid", "commconns.comm")
  .where("commconns.client", clid)
  .then(function (comms) {

    res.render("casemanagers/client/newconversation/createmessage", {
      template: null,
      comms: comms
    });
    
  }).catch(errorRedirect);
});



router.post("/new/craftmessage", function (req, res) {  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid;

  var cmid = req.body.cmid;
  var clid = req.body.clid;
  var subject = req.body.subject;
  var content = req.body.content;
  var commid = req.body.commid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect(redirect_loc);
  } else if (!content || content.length < 1 || !subject || subject.length < 1) {
    req.flash("warning", "Subject of message length missing or too short.");
    res.redirect(redirect_loc + "/convos/new/selectpath");
  } else {

    var newConvoId;

    Convo.closeAll(cmid, clid)
    .then(() => {
      return Convo.create(cmid, clid, subject, true)
    }).then((convoId) => {
      newConvoId = convoId
      return Communication.findById(commid)
    }).then((communication) => {
      var contentArray = content.match(/.{1,1599}/g);
      var twilioOperations = {
        error: false,
        explanation: null
      };

      contentArray.forEach(function (contentPortion, contentIndex) {
        var lastPortion = contentIndex == (contentArray.length - 1);

        twClient.sendMessage({
          to: communication.value,
          from: TWILIO_NUM,
          body: contentPortion
        }, (err, msg) => {
          if (err) {
            res.send(err)

            if (err.hasOwnProperty("code") && err.code == 21211) {
              twilioOperations.error = true;
              twilioOperations.explanation = "That number is not a valid phone number.";
            } else {
              twilioOperations.error = true;
            }

            // Run only if error during last portion
            if (lastPortion) {
              if (twilioOperations.explanation) {
                res.status(500).send(twilioOperations.explanation);
              } else {
                res.redirect("/500");
              }
            }

          } else {
            Message.create({
              convo: newConvoId,
              comm: commid,
              content: contentPortion,
              inbound: false,
              read: true,
              tw_sid: msg.sid,
              tw_status: msg.status,
            })
            .then((messageId) => {

              // Run only if error during last portion
              if (lastPortion) {
                if (twilioOperations.error) {
                  res.redirect("/500");
                } else {
                  req.flash("success", "New conversation created.");
                  redirect_loc = redirect_loc + "/convos/" + newConvoId;
                  res.redirect(redirect_loc);                  
                }
              }

            }).catch(errorRedirect);
          }
        })

      });

    }).catch(errorRedirect);
  }
});

router.get("/:convid", function (req, res) {
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/convos/" + req.params.convid;

  var cmid = req.params.cmid;
  var clid = req.params.clid;
  var convid = req.params.convid;

  if ((Number(cmid) !== Number(req.user.cmid)) && !req.user.superuser) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect(redirect_loc);

  } else {
    cmview.getConvo(cmid, clid, convid)
    .then(function (obj) {

      var rawQuery = "UPDATE msgs SET read = TRUE WHERE msgid IN ( ";
      rawQuery += "SELECT msgs.msgid FROM clients ";
      rawQuery += "LEFT JOIN convos ON (convos.client=clients.clid) ";
      rawQuery += "LEFT JOIN msgs ON (msgs.convo=convos.convid) ";
      rawQuery += "WHERE clients.cm=" + cmid  + " AND clients.clid=" + clid + " AND msgs.read=FALSE) ";

      db.raw(rawQuery).then(function (success) {

        db("clients").where("clid", clid).limit(1).then(function (cls) {
          obj.client = cls[0];
          res.render("casemanagers/client/msgs", obj);
        }).catch(errorRedirect);

      }).catch(errorRedirect);

    }).catch(function (err) {
      if (err == "404") { 
        notFound(res); 
      } else { 
        res.redirect("/500"); 
      }
    })

  }
});

router.get("/:convid/selecttemplate", function (req, res) {
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/convos/" + req.params.convid;


  db("templates")
  // Either this is an active org template
  .where("org", req.user.org)
  .andWhere("casemanager", null)
  .andWhere("templates.active", true)
  
  // ... or an active case manager template
  .orWhere("casemanager", req.user.cmid)
  .andWhere("templates.active", true)
  
  .orderByRaw("updated DESC")
  .then(function (templates) {

    var templateIDs = templates.map(function (ea) {
      return ea.template_id;
    });

    // TO DO: Combine with above DB query
    // This should really be part of the above database query, not a second operation
    db("template_use")
    .count("template_use_id")
    .whereIn("template", templateIDs)
    .groupBy("template")
    .then(function (template_use) {

      // Add counts to each template
      templates = templates.map(function (eaTemp) {
        // Minimum count would be zero
        var totalUse = 0;
        // Iterate through used template counts and update
        template_use.forEach(function (eaUse) {
          if (eaUse.template == eaTemp.template_id) {
            totalUse = eaUse.count;
          }
        });
        // Figure out how to handle difference in camelcase v. Postgres data
        eaTemp.times_used = totalUse;
        return eaTemp;
      });

      res.render("casemanagers/client/newconversation/selecttemplate", {
        templates: templates
      });

    }).catch(errorRedirect);  
  }).catch(errorRedirect);
});


router.post("/:convid", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid + "/convos/" + req.params.convid;

  var cmid = req.params.cmid;
  var clid = req.params.clid;
  var convid = req.params.convid;

  var commid = req.body.commid;
  var content = req.body.content;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect("/cms/" + req.user.cmid);
  } else if (typeof content !== "string" || content == "") {
    req.flash("warning", "Text entry either too short or not of type string.");
    res.redirect(redirect_loc)
  } else if (typeof content == "string" && content.length > 160) {
    req.flash("warning", "Text entry is too long; limit is 160 characters.");
    res.redirect(redirect_loc)
  } else {
    content = content.trim().substr(0,159);

    Communication.findById(commid)
    .then((communication) => {
      if (communication) {
        twClient.sendSms({
          to: communication.value,
          from: TWILIO_NUM,
          body: content,
        }, function (err, msg) {
          if (err) {
            console.log("Twilio send error: ", err);
            if (err.hasOwnProperty("code") && err.code == 21211) res.status(500).send("That number is not a valid phone number.");
            else res.redirect("/500");
          } else {
            Message.create({
              convo: convid,
              comm: commid,
              content: content,
              inbound: false,
              read: true,
              tw_sid: msg.sid,
              tw_status: msg.status,
            })
            .then((messageId) => {
              db("convos").where("convid", convid)
              .update({updated: db.fn.now()})
              .then(function (success) {
                req.flash("success", "Sent message.");
                res.redirect(redirect_loc)
              }).catch(errorRedirect);
            }).catch(errorRedirect);
          }
        });
      } else {
        notFound(res)
      }
    }).catch(errorRedirect);
  }
});

router.post("/:convid/close", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid + "/convos/" + req.params.convid;

  var cmid = req.params.cmid;
  var clid = req.params.clid;
  var convid = req.params.convid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect(redirect_loc);
  } else {

    cmview.getConvo(cmid, clid, convid)
    .then(function (obj) {
      
      db("convos").where("convid", convid).update({open: false, updated: db.fn.now()})
      .then(function (success) {
        req.flash("success", "Closed conversation.");
        res.redirect(redirect_loc);

      }).catch(function (err) {
        res.redirect("/500");
      })

    }).catch(function (err) {
      if (err == "404") {
        notFound(res);
      } else {
        res.redirect("/500");
      }
    })

  }
});

router.post("/:convid/open", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid + "/convos/" + req.params.convid;

  var cmid = req.params.cmid;
  var clid = req.params.clid;
  var convid = req.params.convid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect(redirect_loc);
  } else {

    db("convos")
    .where("client", clid)
    .andWhere("cm", cmid)
    .andWhere("convos.open", true)
    .pluck("convid")
    .then(function (convos) {
      
      db("convos").whereIn("convid", convos)
      .update({ open: false })
      .then(function (success) {

        cmview.getConvo(cmid, clid, convid)
        .then(function (obj) {
          
          db("convos").where("convid", convid).update({open: true, updated: db.fn.now()})
          .then(function (success) {
            req.flash("success", "Conversation reopened.");
            res.redirect(redirect_loc);

          }).catch(function (err) {
            res.redirect("/500");
          })

        }).catch(function (err) {
          if (err == "404") {
            notFound(res);
          } else {
            res.redirect("/500");
          }
        });

      }).catch(errorRedirect);
    }).catch(errorRedirect);
  }
});

router.post("/:convid/accept", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid + "/convos/" + req.params.convid;

  var cmid = req.params.cmid;
  var clid = req.params.clid;
  var convid = req.params.convid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect(redirect_loc);
  } else {

    cmview.getConvo(cmid, clid, convid)
    .then(function (obj) {
      
      db("convos").where("convid", convid).update({accepted: true, updated: db.fn.now()})
      .then(function (success) {
        req.flash("success", "Closed conversation.");
        res.redirect(redirect_loc);

      }).catch(function (err) {
        res.redirect("/500");
      })

    }).catch(function (err) {
      if (err == "404") {
        notFound(res);
      } else {
        res.redirect("/500");
      }
    })

  }
});


router.post("/:convid/reject", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid;

  var cmid = req.params.cmid;
  var clid = req.params.clid;
  var convid = req.params.convid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Mixmatched user cmid and request user cmid insert.");
    res.redirect(redirect_loc);
  } else {
    
    db("msgs").where("convo", convid).delete()
    .then(function (success) {

      db("convos").where("convid", convid).delete()
      .then(function (success) {
        req.flash("success", "Closed conversation.");
        res.redirect(redirect_loc);

      }).catch(errorRedirect);

    }).catch(errorRedirect);

  }
});


// EXPORT ROUTER OBJECt
module.exports = router;


