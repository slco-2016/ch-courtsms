

// (Sub) router
let express         = require("express");
let router          = express.Router({mergeParams: true});


// Models
let modelsImport  = require("../../../../models/models");
let Client        = modelsImport.Client;
let Clients       = modelsImport.Clients;
let ColorTags     = modelsImport.ColorTags;
let Convo         = modelsImport.Convo;
let Message       = modelsImport.Message;
let Messages      = modelsImport.Messages;
let Communication = modelsImport.Communication;
let Templates     = modelsImport.Templates;
let Users         = modelsImport.Users;


// General error handling
let errorHandling   = require("../../utilities/errorHandling");
let error500       = errorHandling.error500;

let logging                 = require("../../utilities/logging");
let logClientActivity       = logging.logClientActivity;
let logConversationActivity = logging.logConversationActivity;

// Create base URL for this page
router.use((req, res, next) => {
  res.locals.parameters = req.params;
  req.redirectUrlBase = `/v4/orgs/${req.user.org}/users/${req.user.cmid}/supervisor/department/${req.params.departmentID}/clients`;
  next();
});

// ROUTES
router.get("/clients/", (req, res) => {
  res.redirect(`/v4/open`);
});

router.get("/clients/open", (req, res) => {
  let limitByUser = isNaN(req.query.limitByUser) ? "null" : Number(req.query.limitByUser);
  res.redirect(`/v4/list/open?limitByUser=${limitByUser}`);
});

router.get("/clients/closed", (req, res) => {
  let limitByUser = isNaN(req.query.limitByUser) ? "null" : Number(req.query.limitByUser);
  res.redirect(`/v4/list/closed?limitByUser=${limitByUser}`);
});

router.get("/clients/list/:clientActivity", (req, res) => {
  let clientActivity = req.params.clientActivity == "open" ? true : false;
  let limitByUser = Number(req.query.limitByUser);
  if (isNaN(limitByUser)) limitByUser = false;
  Clients.findByDepartment(req.user.department, clientActivity)
  .then((clients) => {

    // Filter by user if elected
    if (limitByUser) {
      clients = clients.filter((client) => {
        return client.cm == limitByUser;
      });
    }

    let renderObject = {
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
        res.render("v4/supervisor/clients/clients", renderObject);
      }).catch(error500(res));
    } else {
      res.render("v4/supervisor/clients/clients", renderObject);
    }

  }).catch(error500(res));
});


router.get("/clients/create", (req, res) => {
  Users.findByDepartment(req.user.department, true)
  .then((users) => {
    res.render("v4/supervisor/clients/create", {
      users: users
    })
  }).catch(error500(res));
});


router.post("/clients/create", (req, res) => {
  let userID = req.body.targetUserID;
  let first = req.body.first;
  let middle = req.body.middle ? req.body.middle : "";
  let last = req.body.last;
  let dob = req.body.DOB;
  let so = req.body.uniqueID1 ? req.body.otn : null;
  let otn = req.body.uniqueID2 ? req.body.so : null;

  Clients.create(userID, first, middle, last, dob, otn, so)
  .then(() => {
    res.redirect(req.redirectUrlBase);
  }).catch(error500(res));
});


router.get("/clients/address/:clientID", (req, res) => {
  let clientID = Number(req.params.clientID);
  Clients.findByID(clientID)
  .then((client) => {
    if (client) {
      res.render("v4/supervisor/clients/address", {
        client: client,
        template: {},
      });
    } else {
      notFound(res);
    }
  }).catch(error500(res));
});


router.get("/clients/address/:clientID/selecttemplate", (req, res) => {
  Templates.findByUser(req.user.cmid)
  .then((templates) => {
    res.render("v4/supervisor/clients/selecttemplate", {
      templates: templates,
      parameters: req.params
    });
  }).catch(error500(res));
});


router.get("/clients/address/:clientID/selecttemplate/:templateID", (req, res) => {
  let templateID = Number(req.params.templateID);
  let userID = req.user.cmid;
  let clientID = Number(req.params.clientID);

  Clients.findByID(clientID)
  .then((client) => {
    if (client) { 
      Templates.findByID(templateID)
      .then((template) => {
        if (template) {
          Templates.logUse(templateID, userID, clientID)
          .then(() => {
            req.params.subject = template.title;
            req.params.message = template.content;
            res.render("v4/supervisor/clients/address", {
              client: client,
              template: template,
            });
          }).catch(error500(res));
        } else {
          res.redirect(`/v4/address/${clientID}`);
        }
      }).catch(error500(res));
    } else {
      notFound(res);
    }
  }).catch(error500(res));
});


router.post("/clients/address/:clientID", (req, res) => {
  let clientID = Number(req.params.clientID);
  let subject = req.body.subject;
  let content = req.body.content;
  let commID = req.body.commID;

  Clients.findByID(clientID)
  .then((client) => {
    if (client) {
      
      let strategy;
      if (isNaN(commID)) {
        strategy = Messages.smartSend(client.cm, clientID, subject, content);
      } else {
        strategy = Messages.startNewConversation(client.cm, clientID, subject, content, commID);
      }

      strategy.then(() => {
        logClientActivity(clientID);
        req.flash("success", "Message to client sent.");
        res.redirect(req.redirectUrlBase);
      }).catch(error500(res));
    } else {
      notFound(res);
    }
  }).catch(error500(res));  
});



// EXPORT ROUTER OBJECt
module.exports = router;


