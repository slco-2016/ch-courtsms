


// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router({mergeParams: true});

// DB via knex.js to run queries
var db  = require("../../app/db");

// UTILITIES
var utils = require("../../utils/utils.js");

// Datetime management
var moment = require("moment");
var moment_tz = require("moment-timezone");

// Error handling
var errorHandlers = utils["errorHandlers"];
var fivehundred   = errorHandlers.fivehundred;


// NOTIFICATION BOARD OVERVIEW
router.get("/", function (req, res) { 
  // Reroute to unsent/open notifications route view
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications/overview/open";
  res.redirect(redirectLoc);
});


// NOTIFICATION BOARD UNSENT NOTIFICATIONS
router.get("/overview/open", function (req, res) {
  var errorRedirect = fivehundred(res);
  
  db("notifications")
  .where("notifications.cm", req.user.cmid)
  .leftJoin("clients", "clients.clid", "notifications.client")
  .andWhere("sent", false)
  .andWhere("closed", false)
  .then(function (notifications) {

    db("orgs")
    .where("orgid", req.user.org)
    .then(function (org) {

      res.render("casemanagers/notifications/overview", {
        notifications: notifications, 
        org: org[0],
        archiveView: false
      });      
    })
    .catch(errorRedirect);

  })
  .catch(errorRedirect);
});


// NOTIFICATION BOARD SENT NOTIFICATIONS
router.get("/overview/closed", function (req, res) {
  var errorRedirect = fivehundred(res);

  db("notifications")
  .where("notifications.cm", req.user.cmid)
  .leftJoin("clients", "clients.clid", "notifications.client")
  .andWhere("sent", true)
  .andWhere("closed", false)
  .then(function (notifications) {

    db("orgs")
    .where("orgid", req.user.org)
    .then(function (org) {
      res.render("casemanagers/notifications/overview", {
        notifications: notifications, 
        org: org[0],
        archiveView: true
      });      
    })
    .catch(errorRedirect);

  })
  .catch(errorRedirect);
});


// GENERATE NOTIFICATION CARD SET: ENTER WORKFLOW
router.get("/new", function (req, res) {
  res.redirect("/cms/" + req.params.cmid + "/notifications/new/parameters")
});


router.get("/new/parameters", function (req, res) {
  var errorRedirect = fivehundred(res);

  retrieveClientsAndClientContactMethods(req.user.cmid, function (clients) {
    if (clients) {
      res.render("casemanagers/notifications/parameters", { 
        notification: {},
        clients: clients
      });
    } else { errorRedirect(); }
  });
});


router.post("/new/selecttemplate", function (req, res) {
  var errorRedirect = fivehundred(res);
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications";
  var cmid = Number(req.user.cmid);
  var org = Number(req.user.org);
  var n = req.body; // n for notification object

  var cardRequested = n.hasOwnProperty("showCardExplicit") ? n.showCardExplicit : null;
  if (isNaN(cardRequested)) { 
    cardRequested = null; 
  } else {
    cardRequested = Number(cardRequested);
  }  

  if (checkComplete_cardOne(n)) {
    if (cardRequested) {
      newNotificationRequestSpecificCard(res, org, cmid, cardRequested, n);
    } else {
      newNotificationRequestSpecificCard(res, org, cmid, 2, n);
    }
  
  } else { 
    req.flash("warning", "Missing required notification parameters.");
    newNotificationRequestSpecificCard(res, org, cmid, 1, n);
  }
});


router.post("/new/craftmessage", function (req, res) {
  var errorRedirect = fivehundred(res);
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications";
  var cmid = Number(req.user.cmid);
  var org = Number(req.user.org);
  var n = req.body; // n for notification object

  var cardRequested = n.hasOwnProperty("showCardExplicit") ? n.showCardExplicit : null;
  if (isNaN(cardRequested)) { 
    cardRequested = null; 
  } else {
    cardRequested = Number(cardRequested);
  }  

  if (checkComplete_cardOne(n)) {
    if (cardRequested) {
      newNotificationRequestSpecificCard(res, org, cmid, cardRequested, n);
    } else {

      // If there is a template, get it and load it
      if (n.hasOwnProperty("templateID")) {
        db("templates")
        .where("template_id", n.templateID)
        .limit(1)
        .then(function (templates) {

          // Make sure there is a valid response
          if (templates.length == 0) {
            notFound(res); 

          } else {
            n.notiSubj = templates[0].title;
            n.notiCopy = templates[0].content;
            newNotificationRequestSpecificCard(res, org, cmid, 3, n);
          }

        }).catch(errorRedirect); 


      // Just proceed with no body or subject
      } else {
        newNotificationRequestSpecificCard(res, org, cmid, 3, n);
      }
    }
  
  } else { 
    req.flash("warning", "Missing required notification parameters.");
    newNotificationRequestSpecificCard(res, org, cmid, 1, n);
  }
});


router.post("/new/submit", function (req, res) {
  var errorRedirect = fivehundred(res);
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications";
  var cmid = Number(req.user.cmid);
  var org = Number(req.user.org);
  var n = req.body; // n for notification object

  var cardRequested = n.hasOwnProperty("showCardExplicit") ? n.showCardExplicit : null;
  if (isNaN(cardRequested)) { 
    cardRequested = null; 
  } else {
    cardRequested = Number(cardRequested);
  }  

  if (!checkComplete_cardOne(n)) {
    req.flash("warning", "Missing required notification parameters.");
    newNotificationRequestSpecificCard(res, org, cmid, 1, n);
  } else if (!checkComplete_cardTwo(n)) {
    req.flash("warning", "Missing notification subject or body.");
    newNotificationRequestSpecificCard(res, org, cmid, 3, n);
  
  // Ok good to go on submit
  } else { 
    // Card 1 content
    var sendD =  n.sendDate;
    var sendTH = Number(n.sendTimeHour);
    var sendTM = Number(n.sendTimeMin);
    var clid =   Number(n.recipient);
    var sendC =  Number(n.recipientComm);

    // Card 2 content
    var notiSubj = n.notiSubj;
    var notiCopy = n.notiCopy;
    
    var sendTime = moment.tz(sendD, "America/Denver")
                    .add(sendTH, "hours")
                    .add(sendTM, "minutes")
                    .format();

    // In the future we need to support repeatable notifications
    // Database schema already supports
    db("notifications")
    .insert({
      cm:      cmid,
      client:  clid,
      comm:    sendC,
      subject: notiSubj,
      message: notiCopy,
      send:    sendTime
    })
    .then(function () {
      res.redirect(redirectLoc);
    })
    .catch(errorRedirect);
  }
});




// EDIT NOTIFICATION CARD
router.get("/:notificationid/edit", function (req, res) {
  var errorRedirect = fivehundred(res);
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications";

  var notificationid = req.params.notificationid;

  retrieveClientsAndClientContactMethods(req.user.cmid, function (clients) {
    if (clients) {

      db("notifications")
      .where("cm", req.user.cmid)
      .andWhere("notificationid", notificationid)
      .then(function (notifications) {

        if (notifications.length > 0) {

          var rawN = notifications[0];
          var time = moment.tz(rawN.send, "America/Denver");
          var n = {
            cmid: req.user.cmid,
            sendDate: time.format("YYYY-MM-DD"),
            sendTimeHour: time.format("HH"),
            sendTimeMin: time.format("mm"),
            recipient: rawN.client,
            recipientComm: rawN.comm,
            notiSubj: rawN.subject,
            notiCopy: rawN.message,
          };

          res.render("casemanagers/notifications/parameters", {
            notification: n,
            clients: clients,
            editView: true,
          });

        } else {
          res.redirect(redirectLoc);
        }

      })
      .catch(errorRedirect);

    } else { errorRedirect(); }
  });
});


// POST EDITS TO NOTIFICATION
router.post("/:notificationid/edit", function (req, res) { 
  var errorRedirect = fivehundred(res);
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications";
  var notificationid = req.params.notificationid;

  var n = req.body; // n for notification object

  // See if they are already in process of working through cards
  if (n.hasOwnProperty("sendDate")) {

    // Special request option to show a certain card in series
    // TO DO: Build out front end support for this, will happen w/ progress dots
    var cardRequested = n.showCardExplicit;

    if (Object.prototype.toString.call(cardRequested) === "[object Array]") {
      cardRequested = cardRequested[0];
    };

    // Figure out where in process the user is
    // Identity
    var cmid = Number(n.cmid);

    // Card 1 content
    var sendD =  n.sendDate;
    var sendTH = Number(n.sendTimeHour);
    var sendTM = Number(n.sendTimeMin);
    var clid =   Number(n.recipient);
    var sendC =  Number(n.recipientComm);

    // End card content
    var notiSubj = n.notiSubj;
    var notiCopy = n.notiCopy;

    // See if all variables have been added from this list
    var cardOneIncomplete  = (sendD == null) || (sendTH == null) || (sendTM == null) || (clid == null) || (sendC == null);
    var copyCardIncomplete = (notiSubj == "") || (notiCopy == "");

    // Manage which card to show
    var showCardOne = false;
    var showCardTwo = false;
    if (cardOneIncomplete) {
      showCardOne = true;
    } else if (copyCardIncomplete) {
      showCardTwo = true;
    }
    if (cardRequested == 1) {
      showCardOne = true;
      showCardTwo = false;
    } else if (cardRequested == 2) {
      showCardOne = false;
      showCardTwo = true;
    }

    // Validate all identity form components
    if (Number(req.user.cmid) !== cmid) {
      res.status(404).send("User ID does not match submitted cmid value");
      // TO DO: Make sure the cm has client actually
      // TO DO: Make sure that comm method is legal

    // Show first card if missing required data or if specifically requested
    } else if (showCardOne) {
      retrieveClientsAndClientContactMethods(req.user.cmid, function (clients) {
        if (clients) {
          res.render("casemanagers/notifications/parameters", { 
            notification: n,
            clients: clients
          });
        } else { errorRedirect(); }
      });

    // Show the notification text entry view
    // TO DO: Add support for selecting from templates in the future
    } else if (showCardTwo) {
      res.render("casemanagers/notifications/copyEntry", { 
        notification: n,
      });      

    // Have everything we need, final submission
    } else {
      var sendTime = moment.tz(sendD, "America/Denver")
                      .add(sendTH, "hours")
                      .add(sendTM, "minutes")
                      .format();

      // In the future we need to support repeatable notifications
      // Database schema already supports
      db("notifications")
      .where("cm", req.user.cmid)
      .andWhere("notificationid", notificationid)
      .update({
        cm:      cmid,
        client:  clid,
        comm:    sendC,
        subject: notiSubj,
        message: notiCopy,
        send:    sendTime,
        updated: db.fn.now()
      })
      .then(function () {
        req.flash("success", "Notification successfully updated.");
        res.redirect(redirectLoc);
      })
      .catch(errorRedirect);
    }

  // Catchall: just start with first notification card
  } else {
    retrieveClientsAndClientContactMethods(req.user.cmid, function (clients) {
      if (clients) {
        res.render("casemanagers/notifications/parameters", { 
          notification: {},
          clients: clients
        });
      } else { errorRedirect(); }
    });
  }
});


// REMOVE A PLANNED NOTIFICATION
router.post("/:notificationid/delete", function (req, res) {
  var errorRedirect = fivehundred(res);
  var redirectLoc = "/cms/" + req.params.cmid + "/notifications";

  var notificationid = req.params.notificationid;

  // Closing will only work if held by current case manager/user
  db("notifications")
  .where("cm", req.user.cmid)
  .andWhere("notificationid", notificationid)
  .update({"closed": true})
  .then(function () {
    // Success, redirect to main notifications page
    req.flash("success", "Notification successfully removed.");
    res.redirect(redirectLoc);
  })
  .catch(errorRedirect);
});



// EXPORT ROUTER OBJECt
module.exports = router;



// UTILITY FUNCIONS
// TO DO: Move this stuff to a different file
function retrieveClientsAndClientContactMethods (cmid, cb) {

  // Note: Modified the query from raw SQL to KNex query
  // TO DO: Debate if this is "really" preferable
  db("comms")
  .select("commconns.client", "clients.first", "clients.last", "commconns.name", "comms.value", "comms.commid")
  .from("comms")
  .leftJoin("commconns", "commconns.comm", "comms.commid")
  .leftJoin("clients", "commconns.client", "clients.clid")
  .leftJoin("cms", "clients.cm", "cms.cmid")
  .where("cms.cmid", cmid)
  .then(function (comms) {
    var clients = [];

    // Iterate through all results and fill out clients list
    comms.forEach(function (row) {
      var name = [row.first, row.last].join(" ");
      var client = {
        name: name,
        id: row.client,
        comms: []
      }

      // Check if the client is already in list
      var alreadyExists = false;
      for (var i = 0; i < clients.length; i++) {
        if (row.client == clients[i].id) {
          alreadyExists = true;
        }
      }

      // Only add if that client is not already in
      if (!alreadyExists) { clients.push(client); }
    });

    // Now we need to add comms to each client object
    clients.forEach(function (client) {

      // Check through all rows
      comms.forEach(function (row) {
        // If row is a match with client
        if (client.id == row.client) {
          // Create a new comm object
          var newComm = {
            name: row.name,
            value: row.value,
            id: row.commid
          };
          // And add it to the client's comms array
          client.comms.push(newComm);
        }
      });
    });

    // Return the cleaned object
    cb(clients);


  }).catch(function (err) { console.log("err", err); cb(false); });
};



function checkComplete_cardOne (n) {
  var sendD  = n.sendDate;
  var sendTH = Number(n.sendTimeHour);
  var sendTM = Number(n.sendTimeMin);
  var clid   = Number(n.recipient);
  var sendC  = Number(n.recipientComm);

  var cardOneIncomplete = (sendD == null) || (sendTH == null) || (sendTM == null) || (clid == null) || (sendC == null);
  if (!cardOneIncomplete) {
    cardOneIncomplete = isNaN(sendTH) || isNaN(sendTM) || isNaN(clid) || isNaN(sendC);
  }
  return !cardOneIncomplete;
};

function checkComplete_cardTwo (n) {
  var notiSubj = n.notiSubj;
  var notiCopy = n.notiCopy;

  var cardTwoIncomplete = (notiSubj == "") || (notiCopy == "");
  return !cardTwoIncomplete;
};

function newNotificationRequestSpecificCard (res, org, cmid, cardNumber, notificationBody) {
  var errorRedirect = fivehundred(res);
  retrieveClientsAndClientContactMethods(cmid, function (clients) {
    if (clients) {
      var included = { 
        notification: notificationBody,
        clients: clients
      };

      if (cardNumber == 1) {
        res.render("casemanagers/notifications/parameters", included);
      } else if (cardNumber == 2) {
        // Query for all templates you have
        getTemplates(org, cmid, function (templates) {
          if (templates) {
            included.templates = templates;
            res.render("casemanagers/notifications/selecttemplate", included);

          } else {
            var redirectLoc = "/cms/" + req.params.cmid + "/notifications";
            res.redirect(redirectLoc);
          }
        });

      } else if (cardNumber == 3) {
        res.render("casemanagers/notifications/craftmessage", included);

      } else { notFound(res); }
    } else { notFound(res); }
  });
};

function getTemplates (org, cmid, cb) {
  db("templates")
  // Either this is an active org template
  .where("org", org)
  .andWhere("casemanager", null)
  .andWhere("templates.active", true)
  
  // ... or an active case manager template
  .orWhere("casemanager", cmid)
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

      cb(templates);      

    }).catch(function () { cb(null); });
  }).catch(function () { cb(null); });
};















