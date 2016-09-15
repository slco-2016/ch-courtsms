'use strict';

// (Sub) router
const express         = require("express");
const router          = express.Router({mergeParams: true});

// Models
const modelsImport          = require("../models/models");
const Alerts                = modelsImport.Alerts;
const Client                = modelsImport.Client;
const Clients               = modelsImport.Clients;
const ColorTags             = modelsImport.ColorTags;
const Communication         = modelsImport.Communication;
const Communications        = modelsImport.Communications;
const CommConns             = modelsImport.CommConns;
const Convo                 = modelsImport.Convo;
const Conversations         = modelsImport.Conversations;
const DepartmentSupervisors = modelsImport.DepartmentSupervisors;
const Departments           = modelsImport.Departments;
const Groups                = modelsImport.Groups;
const Message               = modelsImport.Message;
const Messages              = modelsImport.Messages;
const Notifications         = modelsImport.Notifications;
const Organizations         = modelsImport.Organizations;
const PhoneNumbers          = modelsImport.PhoneNumbers;
const Templates             = modelsImport.Templates;
const Users                 = modelsImport.Users;


// Twilio library tools and secrets
const credentials     = require("../credentials");
const ACCOUNT_SID     = credentials.accountSid;
const AUTH_TOKEN      = credentials.authToken;
const twilio          = require("twilio");
const twilioClient    = require("twilio")(ACCOUNT_SID, AUTH_TOKEN);


// Outside library requires
let moment    = require("moment");
let moment_tz = require("moment-timezone");


// General error handling
const errorHandling = require("./errorHandling");
const error500     = errorHandling.error500;
const notFound      = errorHandling.notFound;

// Internal utilities
let logging                 = require("./logging");
let logClientActivity       = logging.logClientActivity;
let logConversationActivity = logging.logConversationActivity;
let emailer                 = require("./emailer");

router.get("/org", (req, res) => {
  let departments;
  let departmentFilter = req.user.department || Number(req.query.department) || null;
  let userFilter = req.query.user || null;
  let users;
  let countsByDay, countsByWeek;

  Departments.findByOrg(req.user.org, true)
  .then((depts) => {
    departments = depts;

    if (departmentFilter) {
      if (req.user.department) departments = departments.filter((d) => { return d.department_id === departmentFilter});
      return Users.findByDepartment(departmentFilter, true)
    } else {
      return Users.findByOrg(req.user.org, true)
    }
  }).then((u) => {
    users = u;

    if (departmentFilter) {
      users = users.filter((u) => { return u.department == departmentFilter});
      return Messages.countsByDepartment(req.user.org, departmentFilter, "day")
    } else {
      return Messages.countsByOrg(req.user.org, "day")
    }
  }).then((counts) => {
    countsByDay = counts;

    if (departmentFilter) {
      return Messages.countsByDepartment(req.user.org, departmentFilter, "week")
    } else {
      return Messages.countsByOrg(req.user.org, "week")
    }
  }).then((counts) => {
    countsByWeek = counts;

    res.render("dashboard", {
      hub: {
        tab: "dashboard/index",
        sel: null
      },
      users:            users,
      userFilter:       userFilter || null,
      departments:      departments,
      departmentFilter: departmentFilter || null,
      countsByDay:      countsByDay,
      countsByWeek:     countsByWeek
    });
  }).catch(error500(res));
});

router.get("/org/users", (req, res) => {
  let status = req.query.status === "inactive" ? false : true;
  let department = req.user.department || req.query.departmentId;

  // Controls against a case where the owner would accidentally have a department
  if (req.user.class === "owner" && !req.query.departmentId) {
    department = null;
  }

  Users.findByOrg(req.user.org, status)
  .then((users) => {

    // Limit by department if supervisor, or specified in query
    if (department) {
      users = users.filter((user) => {
        return Number(req.user.department) === Number(user.department);
      });        
    }

    res.render("users/index", {
      hub: {
        tab: "users",
        sel: status ? "active" : "inactive"
      },
      users: users
    });
  }).catch(error500(res));
});

router.get("/org/users/create", (req, res) => {
  res.render("users/create");
});

router.post("/org/users/create", (req, res) => {
  Users.findByEmail(decodeURIComponent(req.body.email))
  .then((u) => {
    if (u) {
      req.flash("warning", "That email already exists in the system.");
      res.redirect("/org/users/create");
    } else {
      Users.createOne(
        req.body.first, 
        req.body.middle, 
        req.body.last, 
        req.body.email, 
        req.user.org, 
        req.user.department, 
        req.body.position, 
        req.body.className
      ).then((generatedPass) => {
        emailer.activationAlert(req.body.email, generatedPass);
        req.flash("success", "Created new user, sent invite email.");
        res.redirect("/org/users");
      }).catch(error500(res));
    }
  }).catch(error500(res));
});

router.get("/org/users/create/check/:email", (req, res) => {
  Users.findByEmail(decodeURIComponent(req.params.email))
  .then((u) => {
    res.json({user: u});
  }).catch(error500(res));
});

router.get("/org/users/:targetUserID/alter/:case", (req, res) => {
  let state = req.params.case === "close" ? false : true;

  Users.changeActivityStatus(req.params.targetUserID, state)
  .then(() => {
    req.flash("success", "Updated user activity state.");
    res.redirect("/org/users");
  }).catch(error500(res));
});

router.get("/org/users/:targetUser/edit", (req, res) => {
  let departments;
  Departments.findByOrg(req.user.org)
  .then((depts) => {
    departments = depts;
    return Users.findByID(req.params.targetUser)
  }).then((targetUser) => {
    if (targetUser) {
      res.render("users/edit", {
        targetUser: targetUser,
        departments: departments
      })
    } else {
      notFound(res);
    }
  }).catch(error500(res));
});

router.post("/org/users/:targetUser/edit", (req, res) => {
  Users.updateOne(
          req.params.targetUser, 
          req.body.first, 
          req.body.middle, 
          req.body.last, 
          req.body.email, 
          req.body.department, 
          req.body.position, 
          req.body.className
  ).then(() => {
    req.flash("success", "Updated user.");
    res.redirect("/org/users");
  }).catch(error500(res));
});

router.get("/org/users/:targetUser/transfer", (req, res) => {
  let departments;
  Departments.findByOrg(req.user.org)
  .then((d) => {
    departments = d;
    return Users.findByID(req.params.targetUser)
  }).then((u) => {
    if (u) {
      res.render("users/transfer", {
        targetUser: u,
        departments: departments
      })
    } else {
      notFound(res);
    }
  }).catch(error500(res));
});

router.post("/org/users/:targetUser/transfer", (req, res) => {
  Users.transferOne(
    req.params.targetUser, 
    req.body.department
  ).then(() => {
    req.flash("success", "Transfered user.");
    res.redirect("/org/users");
  }).catch(error500(res));
});

router.get("/org/clients", (req, res) => {
  let status      = req.query.status == "closed" ? false : true;
  let department  = req.user.department || req.query.departmentId;

  // Controls against a case where the owner would accidentally have a department
  if (req.user.class === "owner" && !req.query.departmentId) {
    department = null;
  }

  let method;
  if (department) {
    method = Clients.findByDepartment(department, status);
  } else {
    method = Clients.findByOrg(req.user.org, status);
  }

  method.then((clients) => {
    if (req.query.limitByUser) {
      clients = clients.filter((c) => {
        return Number(c.cm) === Number(req.query.limitByUser);
      });
    }

    res.render("clients/index", {
      hub: {
        tab: "clients",
        sel: status ? "open" : "closed"
      },
      clients: clients,
      limitByUser: req.query.limitByUser || null
    });
  }).catch(error500(res));
});

router.get("/org/clients/create", (req, res) => {
  Users.findByOrg(req.user.org)
  .then((users) => {
    if (req.user.department) {
      users = users.filter((u) => { return u.department == req.user.department });
    }
    res.render("clients/create", {
      users: users
    });
  }).catch(error500(res));
});

router.post("/org/clients/create", (req, res) => {
  let userId = req.body.targetUser;    
  let first  = req.body.first;    
  let middle = req.body.middle ? req.body.middle : "";    
  let last   = req.body.last;   
  let dob    = req.body.DOB;    
  let so     = req.body.uniqueID1 ? req.body.uniqueID1 : null;    
  let otn    = req.body.uniqueID2 ? req.body.uniqueID2 : null;
  Client.create(
          userId, 
          first, 
          middle, 
          last, 
          dob, 
          so,  // note these should be renamed
          otn // this one as well
  ).then(() => {
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

// For all /org/clients/:clientId, include local obj. client
router.use("/org/clients/:clientId", (req, res, next) => {
  Client.findByID(req.params.clientId)
  .then((c) => {
    if (c) {
      res.locals.client = c;
      next();
    } else {
      notFound(res);
    }
  }).catch(error500(res));
});

router.get("/org/clients/:clientId", (req, res) => {
  res.send("special org view of client");
});

router.get("/org/clients/:clientId/address", (req, res) => {
  res.render("clients/address", {
    template: req.query,
  });
});

router.post("/org/clients/:clientId/address", (req, res) => {
  let userId   = res.locals.client.cm;
  let clientId = req.params.clientId;
  let subject  = req.body.subject;
  let content  = req.body.content;
  let commID   = req.body.commID == "null" ? null : req.body.commID;
  let method;

  if (commID) {
    method = Messages.startNewConversation(userId, clientId, subject, content, commID);
  } else {
    method = Messages.smartSend(userId, clientId, subject, content);
  }

  method.then(() => {
    logClientActivity(clientId);
    req.flash("success", "Message to client sent.");
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

router.get("/org/clients/:clientId/alter/:status", (req, res) => {
  let clientId = req.params.clientId;
  let status = req.params.status == "open";
  Client.alterCase(clientId, status)
  .then(() => {
    logClientActivity(clientId);
    req.flash("success", "Client case status changed.")
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

router.get("/org/clients/:clientId/edit", (req, res) => {
  res.render("clients/edit");
});

router.post("/org/clients/:clientId/edit", (req, res) => {
  let clientId  = req.params.clientId;
  let first     = req.body.first;
  let middle    = req.body.middle;
  let last      = req.body.last;
  let dob       = req.body.dob;
  let so        = req.body.uniqueID1;
  let otn       = req.body.uniqueID2;
  Client.editOne(
          clientId, 
          first, 
          middle, 
          last, 
          dob, 
          so, 
          otn
  ).then(() => {
    logClientActivity(req.params.clientId);
    req.flash("success", "Edited client.");
    res.redirect(`/org/clients`);
  }).catch(error500(res));
});

router.get("/org/clients/:clientId/transfer", (req, res) => {
  let allDep = req.query.allDepartments == "true" ? true : false;
  if (req.user.class === "owner") {
    allDep = true;
  }
  Users.findByOrg(req.user.org)
  .then((users) => {
    // Limit only to same department transfers
    if (!allDep) users = users.filter((u) => { return u.department == req.user.department });

    res.render("clients/transfer", {
      users: users,
      allDepartments: allDep
    });
  }).catch(error500(res));
});

router.post("/org/clients/:clientId/transfer", (req, res) => {
  const fromUserID = res.locals.client.cm;
  const toUserID   = req.body.userID;
  const clientId   = req.params.clientId;
  const bundleConv = req.params.bundleConversations ? true : false;

  Users.findByID(toUserID)
  .then((user) => {
    if (user && user.active) {
      Client.transfer(clientId, fromUserID, toUserID, bundleConv)
      .then(() => {
        logClientActivity(clientId);
        res.redirect(`/org/clients`);
      }).catch(error500(res));

    } else {
      notFound(res);
    }
  }).catch(error500(res));
});


module.exports = router;


