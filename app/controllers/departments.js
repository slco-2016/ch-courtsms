const PhoneNumbers = require('../models/phoneNumbers');
const Departments = require('../models/departments');
const Users = require('../models/users');
const DepartmentSupervisors = require('../models/departmentSupervisors');

module.exports = {
  index(req, res) {
    let status = req.query.status === "inactive" ? false : true;

    Departments.findByOrg(req.user.org, status)
    .then((departments) => {
      res.render("departments/index", {
        hub: {
          tab: "departments",
          sel: status ? "active" : "inactive"
        },
        departments: departments
      });
    }).catch(res.error500);
  },
  new(req, res) {
    PhoneNumbers.findByOrgID(req.user.org)
    .then((phoneNumbers) => {
      res.render("departments/create", {
        phoneNumbers: phoneNumbers
      });
    }).catch(res.error500);
  },
  create(req, res) {
    Departments.createOne(
                  req.user.org,    // organization
                  req.body.name,   // new dep't name
                  req.body.number, // associated number
                  req.user.cmid    // created by
    ).then(() => {
      req.flash("success", "Made new department.");
      res.redirect("/org/departments");
    }).catch(res.error500);
  },
  edit(req, res) {
    Departments.findByID(req.params.departmentId)
    .then((department) => {
      if (department) {
        PhoneNumbers.findByOrgID(req.user.org)
        .then((phoneNumbers) => {
          res.render("departments/edit", {
            department: department,
            phoneNumbers: phoneNumbers
          });
        }).catch(res.error500);

      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },
  update(req, res) {
    Departments.editOne(
      req.params.departmentId, // department
      req.body.name,           // new name
      req.body.number          // new associated number
    ).then(() => {
      req.flash("success", "Updated department.");
      res.redirect("/org/departments");
    }).catch(res.error500);
  },
  supervisorsIndex(req, res) {
    let supervisors;
    DepartmentSupervisors.findByDepartmentIDs(req.params.departmentId)
    .then((s) => {
      supervisors = s;
      return Users.findByOrg(req.user.org)
    }).then((users) => {

      // Limit options to only users already added to the department
      // "Promote from within" concept
      let members = users.filter(function (u) {
        return Number(u.department) == Number(req.params.departmentId);
      });

      res.render("departments/supervisors", {
        supervisors: supervisors,
        members: members
      });
    }).catch(res.error500);
  },
  supervisorsUpdate(req, res) {
    if (!Array.isArray(req.body.supervisorIds)) req.body.supervisorIds = [req.body.supervisorIds];

    DepartmentSupervisors.updateSupervisors(
      req.params.departmentId, 
      req.body.supervisorIds, 
      req.body.revertClass
    ).then(() => {
      req.flash("success", "Updated department supervisors.");
      res.redirect("/org/departments");
    }).catch(res.error500);
  },
  alter(req, res) {
    let state = req.params.case === "close" ? false : true;

    Departments.findMembers(req.params.departmentID)
    .then((members) => {
      if (members.length == 0) {
        Departments.alterCase(req.params.departmentID, state)
        .then(() => {
          req.flash("success", "Changed department activity status.");
          res.redirect("/org/departments");
        }).catch(res.error500);
      } else {
        req.flash("warning", "Need to remove or close out members first.");
        res.redirect("/org/departments");
      }
    }).catch(res.error500);
  },
};