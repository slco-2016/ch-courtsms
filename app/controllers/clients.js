const Clients = require('../models/clients');
const Client = require('../models/client');
const Users = require('../models/users');

function _getUser (req, res) {
  let userId = res.locals.client.cm;
  if (res.locals.level == "user") {
    userId = req.user.cmid;
  }
  return userId;
};

module.exports = {
  
  index(req, res) {
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
    }).catch(res.error500);
  },

  new(req, res) {
    Users.findByOrg(req.user.org)
    .then((users) => {
      if (req.user.department) {
        users = users.filter((u) => { return u.department == req.user.department });
      }
      res.render("clients/create", {
        users: users
      });
    }).catch(res.error500);
  },

  edit(req, res) {
    res.render("clients/edit");
  },

  create(req, res) {
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
    }).catch(res.error500);
  },

  addressCraft(req, res) {
    res.render("clients/address", {
      template: req.query
    });
  },

  addressSubmit(req, res) {
    let userId   = res.locals.client.cm;
    if (res.locals.level == "user") {
      userId = req.user.cmid;
    }

    let clientId = req.params.client;
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
      req.logActivity.client(clientId);
      req.flash("success", "Message to client sent.");
      res.redirect(`/org/clients`);
    }).catch(res.error500);
  },

  alter(req, res) {
    let userId = _getUser(req, res);
    let clientId = req.params.client;
    let status = req.params.status == "open";
    Client.alterCase(clientId, status)
    .then(() => {
      req.logActivity.client(clientId);
      req.flash("success", "Client case status changed.")
      res.redirect(`/org/clients`);
    }).catch(res.error500);
  },

};