

// (Sub) router
let express         = require("express");
let router          = express.Router({mergeParams: true});


// Models
let modelsImport  = require("../../../../models/models");
let Users         = modelsImport.Users;
let Client        = modelsImport.Client;
let Clients       = modelsImport.Clients;
let ColorTags     = modelsImport.ColorTags;
let Convo         = modelsImport.Convo;
let Message       = modelsImport.Message;
let Messages      = modelsImport.Messages;
let Departments   = modelsImport.Departments;


// General error handling
let errorHandling   = require("../../utilities/errorHandling");
let error500       = errorHandling.error500;

// Create base URL for this page
router.use((req, res, next) => {
  res.locals.parameters = req.params;
  req.redirectUrlBase = `/v4/orgs/${req.user.org}/users/${req.user.cmid}/supervisor/department/${req.params.departmentID}/dashboard`;
  next();
});


// ROUTES

router.get("/dashboard/", (req, res) => {
  res.redirect(`/v4/overview`);
});

router.get("/dashboard/overview", (req, res) => {
  let users, clients, countsByWeek, countsByDay;
  let orgID = Number(req.user.org);
  let departmentID = Number(req.params.departmentID);
  let userFilterID = Number(req.query.targetUserID);
  if (isNaN(userFilterID)) userFilterID = null;

  Departments.findById(departmentID)
  .then((dept) => {
    department = dept;
    return Users.findByDepartment(departmentID, true)
  }).then((usrs) => {
    users = usrs;
    return Clients.findByDepartment(departmentID, true);
  }).then((cls) => {
    clients = cls;
    if (userFilterID) {
      clients.filter(function(client) {
        return client.cm == userFilterID;
      });
    }

    if (userFilterID) return Messages.countsByUser(userFilterID, "day");
    else              return Messages.countsByDepartment(departmentID, "day");
  }).then((counts) => {
    countsByDay = counts;
    if (userFilterID) return Messages.countsByUser(userFilterID, "week");
    else              return Messages.countsByDepartment(departmentID, "week");
  }).then((counts) => {
    countsByWeek = counts;
    let userIds = users.map((user) => {
      return user.cmid;
    });
    return new Promise ((fulfill, reject) => {
      fulfill(userIds);
    })
  }).map((userIds) => {
    return Messages.countsByUser(userID, "week");
  }).then((usersWithMessageCounts) => {

    res.render("v4/supervisor/dashboards/organization", {
      hub: {
        tab: "dashboard",
        sel: null
      },
      department: department,
      users: users,
      userFilterID, userFilterID,
      clients: clients,
      countsByWeek: countsByWeek,
      countsByDay: countsByDay,
      usersWithMessageCounts: usersWithMessageCounts
    });
  }).catch(error500(res));
});




// EXPORT ROUTER OBJECt
module.exports = router;


