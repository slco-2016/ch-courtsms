var express = require("express");
var router = express.Router();

var db  = require("../app/db");
var sms = require("../utils/utils.js")["sms"];
var pass = require("../utils/utils.js")["pass"];
var orgtools = require("../utils/utils.js")["orgs"];

router.get("/", function (req, res) {
  db("orgs").orderBy("name")
  .then(function (orgs) {

    res.render("super/orgs", {
      orgs: orgs
    });
  }).catch(function (err) {
    res.redirect("/500");
  });
});

router.post("/", function (req, res) {
  var name = req.body.name;
  var from = sms.clean_phonenum(req.body.phone);
  var email = req.body.email;
  var expiration = req.body.expiration;
  var allotment = Number(req.body.allotment);

  var clearcheck = orgtools.new_org_param_check(name, from, email, expiration, allotment);

  if (clearcheck.err) {
    req.flash("warning", clearcheck.reason);
    res.redirect("/orgs");
  } else {

    // clean the inputs
    name = name.trim();
    email = email.toLowerCase();
    expiration = new Date(Date.parse(expiration)).toISOString();
    allotment = Number(allotment);

    orgtools.new_org_insert(name, from, email, expiration, allotment)
    .then(function (success) {
      req.flash("success", success.reason);
      res.redirect("/orgs/" + success.orgid);
    }).catch(function (err) {
      req.flash("warning", err.reason);
      res.redirect("/orgs");
    })
  }
});

router.get("/:orgid", function (req, res) {
  var orgid = req.params.orgid;
  db("orgs").where("orgid", orgid).limit(1)
  .then(function (orgs) {

    if (orgs.length > 0) {
      var org = orgs[0];

      db("cms").where("org", orgid).orderBy("last")
      .then(function (cms) {

        res.render("super/org", {
          org: org,
          cms: cms,
          msgs: {}
        });
        
      }).catch(function (err) {
        res.redirect("/500");
      });

    } else {
      notFound(res);
    }

  }).catch(function (err) {
    res.redirect("/500");
  });
});

router.post("/:orgid", function (req, res) {
  var redirect_loc = "/orgs/" + req.params.orgid;

  var orgid = req.body.orgid;
  var first = req.body.first;
  var middle = req.body.middle;
  var last = req.body.last;
  var email = req.body.email;
  var password = req.body.password;
  var position = req.body.position;
  var department = req.body.department;
  var admin = req.body.admin;

  if (typeof email == "string") { email = email.toLowerCase(); }

  if (admin == "true") admin = true;
  if (admin !== true) admin = false;
  if (!middle) middle = null;

  if (!orgid) {
    req.flash("warning", "Missing orgid.");
    res.redirect(redirect_loc);
  } else if (!first) {
    req.flash("warning", "Missing first name.");
    res.redirect(redirect_loc);
  } else if (!last) {
    req.flash("warning", "Missing last name.");
    res.redirect(redirect_loc);
  } else if (!email) {
    req.flash("warning", "Missing email.");
    res.redirect(redirect_loc);
  } else if (!password) {
    req.flash("warning", "Missing password.");
    res.redirect(redirect_loc);
  } else if (!position) {
    req.flash("warning", "Missing position.");
    res.redirect(redirect_loc);
  } else if (!department) {
    req.flash("warning", "Missing department.");
    res.redirect(redirect_loc);
  } else {

    db("cms").where("email", email)
    .then(function (cms) {

      if (cms.length > 0) {
        req.flash("warning", "Email already in use.");
        res.redirect(redirect_loc);
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
        }).catch(function () {
          res.redirect("/500");
        });
      }

    }).catch(function () {
      res.redirect("/500");
    })

  }
});

// delete method workaround
router.post("/:orgid/cms/:cmid/delete", function (req, res) {
  var redirect_loc = "/orgs/" + req.params.orgid;
  var cmid = req.body.cmid;

  db("cms").where("cmid", cmid).update({active: false})
  .then(function (success) {
    req.flash("success", "Deactivated member.");
    res.redirect(redirect_loc);
  }).catch(function () {
    res.redirect("/500");
  });
});

module.exports = router;
