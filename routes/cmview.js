// SECRET STUFF
var credentials = require("../credentials");
var ACCOUNT_SID = credentials.accountSid;
var AUTH_TOKEN = credentials.authToken;
var TWILIO_NUM = credentials.twilioNum;

// DEPENDENCIES
// Router
var express = require("express");
var router = express.Router();

// DB via knex.js to run queries
var db  = require("../server/db");

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
      res.render("casemanagers/cmlanding", { counts: counts.rows });
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
      if (cmid !== Number(cl.cm) && !req.user.superuser) { res.redirect("/404"); }
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



// ARCHIVE A CLIENT
router.post("/:cmid/cls/:clid/archive", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/cms/" + req.params.cmid;

  db("clients")
  .where("clid", req.params.clid)
  .update({active: false, updated: db.fn.now()})
  .then(function (success) {
    req.flash("success", "Archived client.");
    res.redirect(redirect_loc);
  }).catch(errorRedirect)
});



// RESTORE AN ARCHIVED CLIENT
router.post("/:cmid/cls/:clid/restore", function (req, res) { 
  
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



// GET A CLIENT'S COMMCONN
router.get("/:cmid/cls/:clid/comm", function (req, res) { 
  
  // Reroute
  var errorRedirect = fivehundred(res);

  // Parameters
  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  // Make sure that cmid queried for is same as user
  if (cmid !== cmid2) { res.redirect("/404"); }
  else {

    // Query for client with case manager's ID
    db("clients")
    .where("cm", req.params.cmid)
    .andWhere("clid", req.params.clid)
    .then(function (clients) {
      if (clients.length > 0) { res.render("casemanagers/client/clientcontact", {client: clients[0]}); } 
      else { res.redirect("/404"); }

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
      if (cls.length == 0) { res.redirect("/404"); }
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
    res.redirect("/404");
  
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

      } else { res.redirect("/404"); }
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



router.get("/:cmid/cls/:clid/convos", function (req, res) {
  
  // Reroute
  var errorRedirect = fivehundred(res);
  
  // Parameters
  var clid = Number(req.params.clid);
  var cmid = Number(req.params.cmid);
  var cmid2 = Number(req.user.cmid);

  if (cmid !== cmid2) { res.redirect("/400"); } 
  else { 

    db("clients").where("cm", cmid).andWhere("clid", clid)
    .then(function (clients) {
      if (clients.length == 0) { res.redirect("/404"); }
      else { 

        db("comms").innerJoin("commconns", "comms.commid", "commconns.comm").where("commconns.client", clid)
        .then(function (comms) {

          res.render("casemanagers/client/clientconvo", {client: clients[0], comms: comms});
          
        }).catch(errorRedirect);
      } 
    }).catch(errorRedirect);
  }
});


router.post("/:cmid/cls/:clid/convos", function (req, res) {
  
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
  } else {

    var newConvoId;

    Convo.closeAll(cmid, clid)
    .then(() => {
      return Convo.create(cmid, clid, subject, true)
    }).then((convoId) => {
      newConvoId = convoId
      return Communication.findById(commid)
    }).then((communication) => {
      return communication.sendMessage(newConvoId, content)
    }).then((messageId) => {
      req.flash("success", "New conversation created.");
      redirect_loc = redirect_loc + "/convos/" + newConvoId;
      res.redirect(redirect_loc);
    }).catch((err) => {
      res.status(500).send(err.message)
    })
  }
});

router.get("/:cmid/cls/:clid/convos/:convid", function (req, res) {
  
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
    cmview.get_convo(cmid, clid, convid)
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
      if (err == "404") { res.redirect("/404"); } 
      else { res.redirect("/500"); }
    })

  }
});

router.post("/:cmid/cls/:clid/convos/:convid", function (req, res) {
  
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
        communication.sendMessage(convid, content)
        .then((messageId) => {
          db("convos").where("convid", convid)
          .update({updated: db.fn.now()})
          .then(function (success) {
            req.flash("success", "Sent message.");
            res.redirect(redirect_loc)
          }).catch(errorRedirect);
        }).catch((err) => {
          res.status(500).send(err.message)
        })
      } else {
        res.redirect("/404")
      }
    }).catch(errorRedirect);
  }
});

router.post("/:cmid/cls/:clid/convos/:convid/close", function (req, res) {
  
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

    cmview.get_convo(cmid, clid, convid)
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
        res.redirect("/404");
      } else {
        res.redirect("/500");
      }
    })

  }
});

router.post("/:cmid/cls/:clid/convos/:convid/open", function (req, res) {
  
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

        cmview.get_convo(cmid, clid, convid)
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
            res.redirect("/404");
          } else {
            res.redirect("/500");
          }
        });

      }).catch(errorRedirect);
    }).catch(errorRedirect);
  }
});

router.post("/:cmid/cls/:clid/convos/:convid/accept", function (req, res) {
  
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

    cmview.get_convo(cmid, clid, convid)
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
        res.redirect("/404");
      } else {
        res.redirect("/500");
      }
    })

  }
});


router.post("/:cmid/cls/:clid/convos/:convid/reject", function (req, res) {
  
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


