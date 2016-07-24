


// DEPENDENCIES
var express       = require("express");
var router        = express.Router();



// UTILIITES
var db            = require("../server/db");
var utils         = require("../utils/utils.js");
var sms           = utils["sms"];
var pass          = utils["pass"];
var orgtools      = utils["orgs"];
var errorHandlers = utils["errorHandlers"];
var fivehundred   = errorHandlers.fivehundred;



// SHOW ORG WITH MESSAGING ACTIVITY FOR EACH ACCOUNT
router.get("/", function (req, res) {
  var errorRedirect = fivehundred(res);
  var orgid = req.user.org;

  db("orgs").where("orgid", orgid).limit(1)
  .then(function (orgs) {

    // Redirect if no organization found with that id
    if (orgs.length == 0) { res.redirect("/404"); }
    else {

      var org = orgs[0];

      // Query 2: Get all case managers in the organizations
      db("cms")
      .where("org", orgid)
      .orderBy("last")
      .then(function (cms) {

        var rawQuery =  " SELECT COUNT(*), cm, date(msgs.created) FROM msgs INNER JOIN convos ON (convos.convid=msgs.convo) " + 
                        " WHERE convos.cm IN (" + cms.map(function (ea) { return ea.cmid; }).join(", ") + " ) " + 
                        " GROUP BY cm, date(msgs.created) ORDER BY DATE DESC; ";

      // Query 3: Get message activity for each case manager
      db.raw(rawQuery)
      .then(function (msgs) {

        var m = {};
        var m2 = {};

        // Make var m a object with counts by dates
        msgs.rows.forEach(function (ea) {
          if (!m[ea.cm]) { m[ea.cm] = {} }
          var d = new Date(ea.date);
          ea.date = [d.getFullYear(), d.getMonth()+1, d.getDate()].join("-");
          m[ea.cm][ea.date] = Number(ea.count);
        });

        // Restructure into a new object with counts converted into an array
        for (var ea in m) {
          var keys = Object.keys(m[ea]).sort(function (a,b) { return new Date(a) - new Date(b); });
          m2[ea] = {
            dates: keys,
            vals: keys.map(function (k) { return m[ea][k]; })
          }
        };

      // Query 4: Get message activity for each case manager
      db("notifications")
      .count("notificationid")
      .then(function (notifications) {
        var notificationsCount = notifications[0].count;

        // Render organization page
        res.render("admin/org", {
          org: org,
          cms: cms,
          msgs: m2,
          stats: {
            notificationsCount: notificationsCount
          }
        });

      }).catch(errorRedirect); // Query 4
      }).catch(errorRedirect); // Query 3
      }).catch(errorRedirect); // Query 2

    }

  }).catch(errorRedirect);
});



// CREATE A NEW CASE MANAGER
router.post("/", function (req, res) {
  var errorRedirect = fivehundred(res);
  var redirect_loc = "/admin";

  var orgid      = isNaN(req.body.orgid) ? null : Number(req.body.orgid);
  var first      = req.body.first      && typeof req.body.first == "string"      && req.body.first.length      > 0 ? req.body.first.trim()      : null;
  var middle     = req.body.middle     && typeof req.body.middle == "string"     && req.body.middle.length     > 0 ? req.body.middle.trim()     : null;
  var last       = req.body.last       && typeof req.body.last == "string"       && req.body.last.length       > 0 ? req.body.last.trim()       : null;
  var email      = req.body.email      && typeof req.body.email == "string"      && req.body.email.length      > 0 ? req.body.email.trim()      : null;
  var password   = req.body.password   && typeof req.body.password == "string"   && req.body.password.length   > 0 ? req.body.password.trim()   : null;
  var position   = req.body.position   && typeof req.body.position == "string"   && req.body.position.length   > 0 ? req.body.position.trim()   : null;
  var department = req.body.department && typeof req.body.department == "string" && req.body.department.length > 0 ? req.body.department.trim() : null;
  var admin      = req.body.admin      && typeof req.body.admin == "string"      && req.body.admin.length      > 0 ? req.body.admin.trim()      : null;


  // Ensure that required form components are included
  if (!orgid || !first || !last || !email || !password || !position || !department) {
    req.flash("warning", "Missing required form elements.");
    res.redirect(redirect_loc);

  // Make sure that org ids line up with user account's
  } else if (Number(req.user.org) !== orgid) {
    req.flash("warning", "Mismatched organization id's on form submit.");
    res.redirect(redirect_loc);

  // All clear to proceed
  } else {

    // Clean up form body values
    email = email.toLowerCase();
    if (!middle) middle = null;

    // Set admin value to boolean
    if (admin == "true") admin = true;
    if (admin !== true) admin = false;

    // Check if email account already exists in system
    // TO DO: Confirm that this is effective enough a control against SQL injection
    db("cms")
    .whereRaw("LOWER(email) = LOWER(?)", [email])
    .then(function (cms) {

      // We found a match
      if (cms.length > 0) {
        req.flash("warning", "Email already in use.");
        res.redirect(redirect_loc);

      // This is a new email, can proceed
      } else {
        db("cms").insert({
          org: orgid,
          first: first,
          middle: middle,
          last: last,
          email: email,
          pass: pass.hashPw(password),
          position: position,
          department: department,
          admin: admin,
          active: true,
          superuser: false,
        }).then(function (success) {
          req.flash("success", "Added new member.");
          res.redirect(redirect_loc);
        }).catch(errorRedirect);
      }

    }).catch(errorRedirect)

  }
});



// REDIRECT TO MAIN VIEW IF NO ADMIN VIEW IS SUPPLIED
router.get("/cms", function (req, res) {
  res.redirect("/admin");
});



// ADMIN VIEW OF CASE MANAGER SPECIFIC ACTIVITY
router.get("/cms/:cmid", function (req, res) {
  var errorRedirect = fivehundred(res);
  var cmid = req.params.cmid;

  // Make sure that cm of same org
  // Make sure you are not querying yoruself
  db("cms")
  .whereNot("cmid", req.user.cmid)
  .andWhere("cmid", cmid)
  .andWhere("org", req.user.org)
  .limit(1)
  .then(function (cms) {

    // If no results, this client does not exist
    if (cms.length == 0) { res.redirect("/404"); } 
    else {

      var cm = cms[0];

      // Get conversations from that case manager
      db("convos")
      .where("cm", cmid)
      .pluck("convid")
      .then(function (convos) {

        // No messages if no conversations
        if (convos.length == 0) { 
          res.render("admin/cmstats", {
            cm: cm,
            msgs: [],
          });

        // Get messages grouped by conversation and day
        } else {
          // Safe from SQL injection becase we can be sure of what string convos looks like
          var rawQuery =  " SELECT COUNT(*), convo, date(msgs.created) " + 
                          " FROM msgs INNER JOIN convos ON (convos.convid=msgs.convo) " + 
                          " WHERE convos.convid IN (" + convos.join(", ") + ") " +
                          " GROUP BY convo, date(msgs.created) ORDER BY DATE DESC; ";
          
          db.raw(rawQuery).then(function (msgs) {
            res.render("admin/cmstats", {
              cm: cm,
              msgs: msgs.rows,
            });
          }).catch(errorRedirect);
        }

      }).catch(errorRedirect);
    }
  }).catch(errorRedirect);
})



// EXPORT ROUTER ROUTES
module.exports = router;





