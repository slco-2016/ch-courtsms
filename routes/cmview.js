


// SECRET STUFF
var credentials = require("../../credentials");
var ACCOUNT_SID = credentials.accountSid;
var AUTH_TOKEN = credentials.authToken;
var TWILIO_NUM = credentials.twilioNum;

// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router();

// DB via knex.js to run queries
var db  = require("../app/db");

// Twilio tools
var twilio = require("twilio");
var twClient = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);

// UTILITIES
var utils = require("../utils/utils.js");

// Models
const Convo = require('../models/models').Convo
const Message = require('../models/models').Message
const Communication = require('../models/models').Communication

// Query tools
var sms = utils["sms"];
var cmview = utils["cmview"];

// Session status control
var auth = utils["pass"];

// Error handling
var errorHandlers = utils["errorHandlers"];
var fivehundred   = errorHandlers.fivehundred;



// LOGIN LANDING PAGE ROUTER
router.get("/", function (req, res) { 
  var errorRedirect = fivehundred(res);

  // Redirects for non-regular users
  if (req.user.superuser)  { res.redirect("/orgs");  } 
  else if (req.user.admin) { res.redirect("/admin"); } 

  // Else this is a regular user and should see the 3-route splash page
  else { 
    var rawQuery =  " SELECT count(msgid) AS count, cms.cmid, cms.first, cms.last, cms.position FROM msgs " + 
                    " LEFT JOIN convos ON (convos.convid = msgs.convo) " + 
                    " LEFT JOIN cms ON (cms.cmid = convos.cm) " + 
                    " WHERE msgs.created > date_trunc('week', CURRENT_DATE) " + 
                    " GROUP BY cms.cmid, cms.first, cms.last, cms.position " +
                    " ORDER BY COUNT DESC; ";

    // Get a list of app use for all case managers this week
    db.raw(rawQuery).then(function (counts) {

      db("convos")
      .count("convid")
      .where("client", null)
      .andWhere("open", true)
      .then(function (convos) {
        var showCaptureBoardBoolean = Number(convos[0].count) > 0;
        res.render("casemanagers/cmlanding", { 
          counts: counts.rows,
          showCaptureBoard: showCaptureBoardBoolean
        });

      }).catch(errorRedirect);
    }).catch(errorRedirect);
  }
});



// SHOW ALL CASE MANAGER CLIENTS WITH NEW MSG NOTIFICATIONS
router.get("/:cmid", function (req, res) { 
  var errorRedirect = fivehundred(res);

  // Parameters
  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  // Make sure cmid variable else 400
  if (isNaN(cmid)) { res.redirect("/400"); }

  // Make sure that cmids line up or reroute if admin
  else if (cmid !== cmid2 && !req.user.superuser) { 

    // If an admin is trying to view this page, it should reroute to the admin CM file view
    var adminViewing = (req.user.cmid !== cmid) && (req.user.org == cm.org);
    if (adminViewing) { res.redirect("/admin/cms/" + cmid); }

    // If individual is not an admin and this is not their page, 401
    else { res.redirect("/401"); }

  // All clear, proceed
  } else {

    // TO DO: Discuss SQL injection risk - I think not possible due to fact that cmid is INT type
    var rawQuery = " SELECT " +
                    "   count(CASE WHEN msgs.read=FALSE THEN 1 ELSE NULL END) AS msg_ct, " +
                    "   convos.open, convos.subject, convos.convid, " +
                    "   clients.*, color_tags.color  " +
                    " FROM clients " + 
                    " LEFT JOIN (SELECT * FROM convos WHERE convos.updated IN (SELECT MAX(convos.updated) FROM convos WHERE cm = " + String(cmid) + 
                    "     GROUP BY client) " + 
                    "     AND cm = " + String(cmid) + ") AS convos " + 
                    "     ON (convos.client=clients.clid) " +
                    " LEFT JOIN color_tags on (clients.color_tag = color_tags.color_tag_id) " + 
                    " LEFT JOIN msgs ON (msgs.convo=convos.convid) " +
                    " WHERE clients.cm = " + String(cmid) + " " +
                    " GROUP BY clients.clid, convos.open, convos.subject, convos.convid, color_tags.color ORDER BY last ASC; ";
    
    db.raw(rawQuery).then(function (clients) {

      // get color tags to replace with color
      if (clients && clients.rows) {
        clients.rows = clients.rows.map(function (ea) {
          ea.color_tag = ea.color;
          return ea;
        });
      }

      res.render("casemanagers/clients/clients", {
        clients: clients.rows,
      });

    }).catch(errorRedirect);
  }
});



// RENDER NEW CLIENT CARD
router.get("/:cmid/cls", function (req, res) { 
  res.render("casemanagers/client/clientnew");
});



// CREATE A NEW CLIENT
router.post("/:cmid/cls", function (req, res) { 

  // Reroute here
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid;

  // Load in all the body elements we will be working with  
  // String variables
  var first  = req.body.first  && typeof req.body.first  == "string" && req.body.first.length  > 0 ? req.body.first.trim()  : null;
  var middle = req.body.middle && typeof req.body.middle == "string" && req.body.middle.length > 0 ? req.body.middle.trim() : null;
  var last   = req.body.last   && typeof req.body.last   == "string" && req.body.last.length   > 0 ? req.body.last.trim()   : null;
  
  // Integer variables
  var cmid   = isNaN(req.body.cmid) ? null : Number(req.body.cmid);
  var otn    = isNaN(req.body.otn)  ? null : Number(req.body.otn);
  var so     = isNaN(req.body.so)   ? null : Number(req.body.so);

  // Dates
  var dob    = isNaN(Date.parse(req.body.dob)) ? null : req.body.dob;

  // Make null any optional components if not supplied
  if (!middle) middle = "";
  if (!otn)    otn = null;
  if (!so)     so = null;
  if (!dob)    dob = "1955-01-01"; // default dob in system

  // Make sure that the required submissions are included
  if (!cmid || !first || !last) {
    req.flash("warning", "Missing required entries of new client creation.");
    res.redirect(redirect_loc);

  // Makre sure the query is going to a the case managers own cmid
  } else if (Number(req.user.cmid) !== Number(cmid)) {
    req.flash("warning", "This ID does not match with the logged-in user");
    res.redirect(redirect_loc);

  // All clear to proceed
  } else {

    var insertObj = {
      cm:     cmid,
      first:  first,
      last:   last,
      active: true
    };

    // include options if not null
    if (middle) insertObj.middle = middle;
    if (dob)    insertObj.dob = dob;
    if (otn)    insertObj.otn = otn;
    if (so)     insertObj.so = so;

    // Run insert
    db("clients")
    .insert(insertObj)
    .returning("clid")
    .then(function (clids) {

      req.flash("success", "Added a new client.");
      redirect_loc = redirect_loc + "/cls/" + clids[0];
      res.redirect(redirect_loc);

    }).catch(errorRedirect);
  }
});



// VIEW A CLIENT
router.get("/:cmid/cls/:clid", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Parameters
  var clid = Number(req.params.clid);
  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  // Make sure that the case manager id lines up
  if (cmid !== cmid2 && !req.user.superuser) { res.redirect("/401"); }
  else {

    // Query 1: Get client information
    db("clients")
    .where("clid", clid)
    .limit(1)
    .then(function (cls) {
      var cl = cls[0];

      // Make sure that the case manager actually owns this client
      // TO DO: Superuser needs to be limited by organization
      if (cmid !== Number(cl.cm) && !req.user.superuser) { notFound(res); }
      else { 

        // Query 2: Get all convos with a client
        db("convos")
        .where("convos.cm", cmid)
        .andWhere("convos.client", clid)
        .orderBy("convos.updated", "desc")
        .then(function (convos) {

        // Query 3: Get all commconns with a client
        db("comms")
        .innerJoin("commconns", "comms.commid", "commconns.comm")
        .where("commconns.client", cl.clid)
        .then(function (comms) {

          var redirect_loc = "/cms/" + String(cmid) + "/cls/" + String(clid) + "/";

          // If there are no commconns, prompt user to add one
          if (comms.length == 0) {
            res.redirect(redirect_loc + "comm");

          // If there are no convos, prompt user to start one
          } else if (convos.length == 0) {
            res.redirect(redirect_loc + "convos");

          // Standard view
          } else {
            res.render("casemanagers/client/client", {
              client: cl,
              comms: comms,
              convos: convos,
            });
          }
          
        }).catch(errorRedirect);
        }).catch(errorRedirect);
      }
    }).catch(errorRedirect);
  }
});



// EDIT VIEW FOR A CLIENT
router.get("/:cmid/cls/:clid/edit", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  
  // Parameters
  var clid = Number(req.params.clid);
  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);
  
  if (cmid !== cmid2) { res.redirect("/401"); }
  else {
    
    db("clients")
    .where("clid", clid)
    .limit(1)
    .then(function (cls) {

      var cl = cls[0];

      // Make sure that the client's CM is same as user (or user is superuser)
      if (cmid == Number(cl.cm) || req.user.superuser) {
        res.render("casemanagers/client/clientedit", { client: cl });
      } else { res.redirect("/401"); }

    }).catch(errorRedirect);

  }
});

// SUBMIT AN EDIT FOR THE CLIENT
router.post("/:cmid/cls/:clid/edit", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid + "/cls/" + req.params.clid;

  // Reference cmid to compare with submitted
  var cmid2  = Number(req.user.cmid);

  // String variables
  var first  = req.body.first && typeof req.body.first == "string" && req.body.first.length > 0 ? req.body.first.trim() : null;
  var middle = req.body.middle && typeof req.body.middle == "string" && req.body.middle.length > 0 ? req.body.middle.trim() : null;
  var last   = req.body.last && typeof req.body.last == "string" && req.body.last.length > 0 ? req.body.last.trim() : null;
  
  // Integer variables
  var cmid   = isNaN(req.body.cmid) ? null : Number(req.body.cmid);
  var clid   = isNaN(req.body.clid) ? null : Number(req.body.clid);
  var otn    = isNaN(req.body.otn) ? null : Number(req.body.otn);
  var so     = isNaN(req.body.so) ? null : Number(req.body.so);

  // Dates
  var dob    = isNaN(Date.parse(req.body.dob)) ? null : req.body.dob;

  if (!middle) middle = "";
  if (!otn) otn = null;
  if (!so) so = null;
  if (dob == "Invalid Date") dob = null;


  // Make null any optional components if not supplied
  if (!middle) middle = "";
  if (!otn)    otn = null;
  if (!so)     so = null;
  if (!dob)    dob = "1955-01-01"; // default dob in system

  // Make sure that the required submissions are included
  if (!cmid || !first || !last) {
    req.flash("warning", "Missing required entries of new client creation.");
    res.redirect(redirect_loc);

  // Makre sure the query is going to a the case managers own cmid
  } else if (cmid !== cmid2) {
    req.flash("warning", "This ID does not match with the logged-in user");
    res.redirect(redirect_loc);

  // All clear to proceed
  } else {

    var insertObj = {
      cm:     cmid,
      first:  first,
      last:   last,
      active: true
    };

    // include options if not null
    if (middle) insertObj.middle = middle;
    if (dob)    insertObj.dob = dob;
    if (otn)    insertObj.otn = otn;
    if (so)     insertObj.so = so;

    // Run insert
    db("clients")
    .where("clid", clid)
    .update(insertObj)
    .then(function (success) {
      req.flash("success", "Updated client.");
      res.redirect(redirect_loc);
    }).catch(errorRedirect)
  }
});



// ARCHIVE A CLIENT CARD RENDER
router.get("/:cmid/cls/:clid/archive", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid;

  // Determine the client ID in question
  var clid = Number(req.params.clid);
  if (isNaN(clid)) {
    clid = null;
  }

  var clientSurveyAlreadySubmitted = false;

  if (clid) {

    // Check if this client has already submitted a survey for it
    db("client_closeout_surveys")
    .where("client", clid)
    .then(function (clients) {

      // If it has, turn on option to not submit
      if (clients.length > 0) {
        clientSurveyAlreadySubmitted = true;
      }

      // Get client
      db("clients")
      .where("clid", clid)
      .then(function (clients) {
        res.render("casemanagers/client/client_closeout_survey", {
          client: clients[0],
          clientSurveyAlreadySubmitted: clientSurveyAlreadySubmitted
        });
      }).catch(errorRedirect);

    }).catch(errorRedirect);

  // If no good client ID, then 404
  } else {
    notFound(res);
  }


});


// SUBMIT SURVEY AND ARCHIVE A CLIENT CARD CONFIRMED SUBMIT
router.post("/:cmid/cls/:clid/submit_survey_and_archive", function (req, res) { 

  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid;

  // Convert likelihoodSuccessWithoutCC to number value
  var likelihoodSuccessWithoutCC = Number(req.body.likelihoodSuccessWithoutCC);
  if (isNaN(likelihoodSuccessWithoutCC)) {
    likelihoodSuccessWithoutCC = null;
  }

  // First we need to clean the req.body for insert
  var insertObj = {
    client: req.body.clientID,
    closeout_status: req.body.closeOutStatus, 
    most_common_method: req.body.mostCommonMethod,
    likelihood_success_without_cc: likelihoodSuccessWithoutCC,
    helpfulness_of_cc: req.body.helpfulnessCC,
    most_often_discussed: req.body.mostOftenDiscussed,
  };

  // Then we insert the cleaned object into client_closeout_surveys
  db("client_closeout_surveys")
  .insert(insertObj)
  .then(function (success) {

    // Then we submit the closure of the client
    db("clients")
    .where("clid", req.params.clid)
    .update({active: false, updated: db.fn.now()})
    .then(function (success) {

      req.flash("success", "Archived client.");
      res.redirect(redirect_loc);

    }).catch(errorRedirect);

  }).catch(errorRedirect);

});

// ONLY ARCHVIE THE CLIENT
router.post("/:cmid/cls/:clid/archive", function (req, res) { 

  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid;

  // Then we submit the closure of the client
  db("clients")
  .where("clid", req.params.clid)
  .update({active: false, updated: db.fn.now()})
  .then(function (success) {

    req.flash("success", "Archived client.");
    res.redirect(redirect_loc);

  }).catch(errorRedirect);

});



// RESTORE AN ARCHIVED CLIENT
router.get("/:cmid/cls/:clid/restore", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid;

  db("clients")
  .where("clid", req.params.clid)
  .update({active: true, updated: db.fn.now()})
  .then(function (success) {
    req.flash("success", "Restored client.");
    res.redirect(redirect_loc);
  }).catch(errorRedirect);
});



// VIEW TO CREATE A NEW CLIENT COMM CONN
router.get("/:cmid/cls/:clid/comm", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Parameters
  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  // Make sure that cmid queried for is same as user
  if (cmid !== cmid2) { notFound(res); }
  else {

    // Query for client with case manager's ID
    db("clients")
    .where("cm", req.params.cmid)
    .andWhere("clid", req.params.clid)
    .then(function (clients) {
      if (clients.length > 0) { res.render("casemanagers/client/clientcontact", {client: clients[0]}); } 
      else { notFound(res); }

    }).catch(errorRedirect);
  }
});



// CREATE A NEW COMMCONN (AND POTENTIALLY A NEW COMM)
router.post("/:cmid/cls/:clid/comm", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var retry_view   = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/comm";
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid;

  // Numbers submitted
  var cmid = isNaN(req.body.cmid) ? null : Number(req.body.cmid);
  var clid = isNaN(req.body.clid) ? null : Number(req.body.clid);

  // Strings submitted
  var type         = req.body.type        && typeof req.body.type == "string"        && req.body.type.length > 0 ? req.body.type.trim() : null;
  var value        = req.body.value       && typeof req.body.value == "string"       && req.body.value.length > 0 ? req.body.value.trim() : null;
  var description  = req.body.description && typeof req.body.description == "string" && req.body.description.length > 0 ? req.body.description.trim() : null;

  // To compare with post body
  var cmid2 = Number(req.user.cmid);
  var clid2 = isNaN(req.body.clid) ? null : Number(req.body.clid);

  // To check phones
  var cellOrLandline = (type == "cell" || type == "landline");

  // If the value is a phone number, clean it
  if (cellOrLandline) {
    value = value.replace(/[^0-9.]/g, "");
    if (value.length == 10) { value = "1" + value; }
  }

  // Make sure that clids line up
  if (clid !== clid2) {
    req.flash("warning", "Client ID does not match.");
    res.redirect(retry_view);

  // Make sure that cmids line up
  } else if (cmid !== cmid2) {
    req.flash("warning", "Case Manager ID does not match user logged-in.");
    res.redirect(retry_view);

  // Make sure that all required components are submitted
  } else if (!type || !value || !description) {
    req.flash("warning", "Missing the required form elements.");
    res.redirect(retry_view);

  // Make sure that phone numbers are 11 digits
  } else if (cellOrLandline && value.length !== 11) {
    req.flash("warning", "Incorrect phone value.");
    res.redirect(retry_view);

  // Make sure that the value supplied is indeed a number for phones
  } else if (cellOrLandline && isNaN(value)) {
    req.flash("warning", "Value supplied is not a number.");
    res.redirect(retry_view);
  
  // All clear to proceed
  } else {

    // See if this value is already in system
    // TO DO: Confirm value injection does not expose SQL injection vulnerabilities
    db("comms")
    .whereRaw("LOWER(value) = LOWER('" + String(value) + "')")
    .limit(1)
    .then(function (comms) {

      // Comm already exists so just create the commconn
      if (comms.length > 0) {

        db("commconns").insert({
          client: clid,
          comm: comms[0].commid,
          name: description
        }).then(function (success) {
          req.flash("success", "Added a new communication method.");
          res.redirect(redirect_loc);
        }).catch(errorRedirect);

      // No comms exist, so we have to create one first
      } else {

        // Query 1: First create the base communication entry
        db("comms").insert({
          type: type,
          value: value,
          description: description
        }).returning("commid").then(function (commids) {

        // Query 2: Create the commconn with the new commid
        db("commconns")
        .insert({
          client: clid,
          comm: commids[0],
          name: description
        }).then(function (success) {
          req.flash("success", "Added a new communication method.");
          res.redirect(redirect_loc);

        }).catch(errorRedirect); // Query 2
        }).catch(errorRedirect); // Query 1

      }
    }).catch(errorRedirect);

  }
});



// VIEW ALL COMMCONNS FOR A CLIENT
router.get("/:cmid/cls/:clid/comms", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid;

  var clid  = Number(req.params.clid);
  var cmid  = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  // Make sure that cmid is user
  if (cmid !== cmid2) { res.redirect(redirect_loc); }
  else {

    // Query 1: Get all client with that cm
    db("clients")
    .where("clid", clid)
    .andWhere("cm", cmid)
    .limit(1)
    .then(function (cls) {

      // Make sure that the client exists under the CM
      if (cls.length == 0) { notFound(res); }
      else { 
        var cl = cls[0];

        // Query 2: Get all convos from that case manager
        // TO DO: Confirm injection of clid acceptable because it is cleaned type INT
        var rawQuery =  " SELECT * FROM comms " +
                        " JOIN commconns ON (comms.commid = commconns.comm) " + 
                        " LEFT JOIN (SELECT count(msgid) AS use_ct, msgs.comm FROM msgs " +
                        "   WHERE msgs.convo " +
                        "   IN (SELECT convos.convid FROM convos WHERE convos.client = " + String(clid) + ") " + 
                        " GROUP BY msgs.comm) AS counts ON (counts.comm = commconns.comm) " +
                        " WHERE commconns.client = " + String(clid) + " AND commconns.retired IS NULL; ";

        db.raw(rawQuery).then(function (comms) {

          res.render("casemanagers/client/clientcomms", {
            client: cl,
            comms: comms.rows
          });
          
        }).catch(errorRedirect); // Query 2
      }

    }).catch(errorRedirect); // Query 1

  }
});



// SHOW EDIT CARD FOR A COMMCONN
router.get("/:cmid/cls/:clid/comms/:commconnid", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/comms";

  var commconnid = Number(req.params.commconnid);
  var clid  = Number(req.params.clid);
  var cmid  = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  // Make sure cmids line up
  if (cmid !== cmid2) {
    req.flash("warning", "Case Manager ID does not match user logged-in.");
    res.redirect(redirect_loc);

  // All IDs should be numbers
  } else if (isNaN(commconnid) || isNaN(clid) || isNaN(cmid)) {
    notFound(res);
  
  // Proceed if all is clear
  // TO DO: Confirm that SQL vulnerabilities do not exist
  } else {
    // Query: Get commconn information and join with comms information
    // TO DO: Refactor this query I think the join could just use the clid we have already
    var rawQuery = "SELECT * FROM commconns " + 
                    " JOIN (SELECT clients.clid " + 
                    "     FROM clients WHERE clients.cm = " + String(cmid) + ") " +
                    "   AS clients ON (clients.clid = commconns.client) " + 
                    " LEFT JOIN comms ON (comms.commid = commconns.comm) " + 
                    " WHERE commconns.client = " + String(clid) + " " +
                    "   AND commconns.commconnid = " + String(commconnid) + " LIMIT 1; ";

    db.raw(rawQuery).then(function (commconns) {
      if (commconns.rows && commconns.rows.length == 1) {
        commconn = commconns.rows[0];
        res.render("casemanagers/client/clientcontactedit", { commconn: commconn });

      } else { notFound(res); }
    }).catch(errorRedirect);
  }
});



// SUBMIT CHANGES TO A COMMCONN
// Note: Currently we only support the name being updated for the commconn
// Note: We want CMs to remove a number rather than change this number - to preserve numbers
router.post("/:cmid/cls/:clid/comms/:commconnid", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/comms";
  var retry_loc    = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/comms/" + req.params.commconnid;

  var clid  = Number(req.params.clid);
  var clid2 = Number(req.body.clid);

  var cmid  = Number(req.params.cmid);
  var cmid2 = Number(req.body.cmid);
  var cmid3 = Number(req.user.cmid);

  var commconnid = Number(req.params.commconnid);

  // String submission
  var description  = req.body.description && typeof req.body.description == "string" && req.body.description.length > 0 ? req.body.description.trim() : null;

  // Make sure cmids line up
  if (cmid !== cmid2 || cmid !== cmid3) {
    req.flash("warning", "Case Manager ID does not match user logged-in.");
    res.redirect(retry_loc);

  // Make sure that clids line up
  } else if (clid !== clid2) {
    req.flash("warning", "Client IDs do not match from post body and URL route.");
    res.redirect(retry_loc);

  // Ensure that commconnid is a number
  } else if (isNaN(commconnid)) {
    req.flash("warning", "Invalid commconnid provided.");
    res.redirect(retry_loc);

  // Make sure description body element okay
  } else if (!description) {
    req.flash("warning", "Missing updated name for communication.");
    res.redirect(retry_loc);

  // TO DO: Control again SQL injection here
  } else {
    var name = description.replace(/["']/g, "").trim().split(" ").filter(function (ea) { return ea.length > 0; }).join(" ");
    var rawQuery = "UPDATE commconns SET name = '" + name + "' WHERE commconnid = " + commconnid + ";";

    db.raw(rawQuery).then(function (commconns) {
      req.flash("success", "Contact method updated.");
      res.redirect(redirect_loc);
    }).catch(errorRedirect);
  }
});




router.post("/:cmid/cls/:clid/comms/:commconnid/close", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/comms";
  var retry_loc = "/cms/" + req.params.cmid + "/cls/" + req.params.clid + "/comms/" + req.params.commconnid;

  var clid = Number(req.params.clid);

  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  var commconnid = Number(req.params.commconnid);

  if (cmid !== cmid2) {
    req.flash("warning", "Case Manager ID does not match user logged-in.");
    res.redirect(retry_loc);
  } else if (isNaN(commconnid)) {
    req.flash("warning", "Invalid commconnid provided.");
    res.redirect(retry_loc);
  
  } else {
    db("commconns").where("commconnid", commconnid)
    .update({retired: db.fn.now()})
    .then(function (success) {
      req.flash("success", "Retired contact method.");
      res.redirect(redirect_loc);

    }).catch(errorRedirect);

  }
});



// All convos management
var convosManagementRoutes = require("./cm-subroutes/convos");
router.use("/:cmid/cls/:clid/convos", convosManagementRoutes);


// Sending group messages logic
var groupManagementRoutes = require("./cm-subroutes/groupmessages");
router.use("/:cmid/groups", groupManagementRoutes);


// Sending group messages logic
var groupManagementRoutes = require("./cm-subroutes/groupmessages");
router.use("/:cmid/groups", groupManagementRoutes);


// Alerts logic
var alertsRoutes = require("./cm-subroutes/alerts");
router.use("/:cmid/alerts", alertsRoutes);


// Notifications logic
var notificationsRoutes = require("./cm-subroutes/notifications");
router.use("/:cmid/notifications", notificationsRoutes);


// Templates logic
var templatesRoutes = require("./cm-subroutes/templates");
router.use("/:cmid/templates", templatesRoutes);


// Colors logic
var clientColorTagRoutes = require("./cm-subroutes/colortag");
router.use("/:cmid/cls/:clid/colortag", clientColorTagRoutes);


// POTENTIALLY DEPERECATED ENDPOINTS... NEED TO MAKE SURE THEY ARE ABSOLUTELY NOT USED ANYMORE
router.post("/:cmid/cls/:clid/close", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid;

  var clid = req.params.clid;
  var cmid = req.params.cmid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Case Manager ID does not match user logged-in.");
    res.redirect(redirect_loc);
  } else {
    
    db("clients").where("clid", clid).limit(1)
    .then(function (clients) {

      if (clients.length > 0) {
        var client = clients[0];

        if (client.cm == cmid) {

          db("clients").where("clid", clid)
          .update({active: false, updated: db.fn.now()})
          .then(function (success) {
            req.flash("success", "Closed out client" + client.first + " " + client.last + ".");
            res.redirect(redirect_loc);

          }).catch(errorRedirect);

        } else {
          req.flash("warning", "You do not have authority to close that client.");
          res.redirect(redirect_loc);
        }

      } else {
        req.flash("warning", "That user id does not exist.");
        res.redirect(redirect_loc);
      }

    }).catch(errorRedirect);

  }
});

router.post("/:cmid/cls/:clid/open", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.user.cmid;

  var clid = req.params.clid;
  var cmid = req.params.cmid;

  if (Number(cmid) !== Number(req.user.cmid)) {
    req.flash("warning", "Case Manager ID does not match user logged-in.");
    res.redirect(redirect_loc);
  } else {
    
    db("clients").where("clid", clid).limit(1)
    .then(function (clients) {

      if (clients.length > 0) {
        var client = clients[0];

        if (client.cm == cmid) {

          db("clients").where("clid", clid)
          .update({active: true, updated: db.fn.now()})
          .then(function (success) {
            req.flash("success", "Re-activated client" + client.first + " " + client.last + ".");
            res.redirect(redirect_loc);

          }).catch(errorRedirect);

        } else {
          req.flash("warning", "You do not have authority to re-activate that client.");
          res.redirect(redirect_loc);
        }

      } else {
        req.flash("warning", "That user id does not exist.");
        res.redirect(redirect_loc);
      }

    }).catch(errorRedirect);

  }
});


// EXPORT ROUTER OBJECt
module.exports = router;


