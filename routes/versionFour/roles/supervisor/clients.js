

// (Sub) router
var express         = require("express");
var router          = express.Router({mergeParams: true});


// Models
const modelsImport  = require("../../../../models/models");
const Client        = modelsImport.Client;
const Clients       = modelsImport.Clients;
const ColorTags     = modelsImport.ColorTags;
const Convo         = modelsImport.Convo;
const Message       = modelsImport.Message;
const Messages      = modelsImport.Messages;
const Communication = modelsImport.Communication;
const Templates     = modelsImport.Templates;
const Users         = modelsImport.Users;


// General error handling
var errorHandling   = require("../../utilities/errorHandling");
var error_500       = errorHandling.error_500;

var logging                 = require("../../utilities/logging");
var logClientActivity       = logging.logClientActivity;
var logConversationActivity = logging.logConversationActivity;

// Create base URL for this page
router.use((req, res, next) => {
  res.locals.parameters = req.params;
  req.redirectUrlBase = `/v4/orgs/${req.params.orgID}/users/${req.params.userID}/supervisor/department/${req.params.departmentID}/clients`;
  next();
});

// ROUTES
router.get("/", function (req, res) {
  res.redirect(`${req.redirectUrlBase}/open`);
});

router.get("/open", (req, res) => {
  var limitByUser = isNaN(req.query.limitByUser) ? "null" : Number(req.query.limitByUser);
  res.redirect(`${req.redirectUrlBase}/list/open?limitByUser=${limitByUser}`);
});

router.get("/closed", (req, res) => {
  var limitByUser = isNaN(req.query.limitByUser) ? "null" : Number(req.query.limitByUser);
  res.redirect(`${req.redirectUrlBase}/list/closed?limitByUser=${limitByUser}`);
});

router.get("/list/:clientActivity", function (req, res) {
  const clientActivity = req.params.clientActivity == "open" ? true : false;
  var limitByUser = Number(req.query.limitByUser);
  if (isNaN(limitByUser)) limitByUser = false;
  Clients.findByDepartment(req.user.department, clientActivity)
  .then((clients) => {

    // Filter by user if elected
    if (limitByUser) {
      clients = clients.filter((client) => {
        return client.cm == limitByUser;
      });
    }

    var renderObject = {
      hub: {
        tab: "clients",
        sel: clientActivity ? "open" : "closed"
      },
      clients: clients,
      limitByUser: null
    };

    if (limitByUser) {
      Users.findByID(limitByUser)
      .then((user) => {
        renderObject.limitByUser = user;
        res.render("v4/supervisorUser/clients/clients", renderObject);
      }).catch(error_500(res));
    } else {
      res.render("v4/supervisorUser/clients/clients", renderObject);
    }

  }).catch(error_500(res));
});


router.get("/create", function (req, res) {
  Users.findByDepartment(req.user.department, true)
  .then((users) => {
    res.render("v4/supervisorUser/clients/create", {
      users: users
    })
  }).catch(error_500(res));
});


router.post("/create", function (req, res) {
  const userID = req.body.targetUserID;
  const first = req.body.first;
  const middle = req.body.middle ? req.body.middle : "";
  const last = req.body.last;
  const dob = req.body.DOB;
  const so = req.body.uniqueID1 ? req.body.otn : null;
  const otn = req.body.uniqueID2 ? req.body.so : null;

  Client.create(userID, first, middle, last, dob, otn, so)
  .then(() => {
    res.redirect(req.redirectUrlBase);
  }).catch(error_500(res));
});


router.get("/address/:clientID", function (req, res) {
  const clientID = Number(req.params.clientID);
  Client.findByID(clientID)
  .then((client) => {
    if (client) {
      res.render("v4/supervisorUser/clients/address", {
        client: client,
        template: {},
      });
    } else {
      res.redirect("/404");
    }
  }).catch(error_500(res));
});


router.get("/address/:clientID/selecttemplate", function (req, res) {
  Templates.findByUser(req.user.cmid)
  .then((templates) => {
    res.render("v4/supervisorUser/clients/selecttemplate", {
      templates: templates,
      parameters: req.params
    });
  }).catch(error_500(res));
});


router.get("/address/:clientID/selecttemplate/:templateID", function (req, res) {
  const templateID = Number(req.params.templateID);
  const userID = req.user.cmid;
  const clientID = Number(req.params.clientID);

  Client.findByID(clientID)
  .then((client) => {
    if (client) { 
      Templates.findByID(templateID)
      .then((template) => {
        if (template) {
          Templates.logUse(templateID, userID, clientID)
          .then(() => {
            req.params.subject = template.title;
            req.params.message = template.content;
            res.render("v4/supervisorUser/clients/address", {
              client: client,
              template: template,
            });
          }).catch(error_500(res));
        } else {
          res.redirect(`${req.redirectUrlBase}/address/${clientID}`);
        }
      }).catch(error_500(res));
    } else {
      res.redirect("/404");
    }
  }).catch(error_500(res));
});


router.post("/address/:clientID", function (req, res) {
  const clientID = Number(req.params.clientID);
  const subject = req.body.subject;
  const content = req.body.content;
  const commID = req.body.commID;

  Client.findByID(clientID)
  .then((client) => {
    if (client) {
      
      var strategy;
      if (isNaN(commID)) {
        strategy = Messages.smartSend(client.cm, clientID, subject, content);
      } else {
        strategy = Messages.startNewConversation(client.cm, clientID, subject, content, commID);
      }

      strategy.then(() => {
        logClientActivity(clientID);
        req.flash("success", "Message to client sent.");
        res.redirect(req.redirectUrlBase);
      }).catch(error_500(res));
    } else {
      res.redirect("/404");
    }
  }).catch(error_500(res));  
});



// EXPORT ROUTER OBJECt
module.exports = router;

