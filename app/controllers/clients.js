const Users = require('../models/users');

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


};