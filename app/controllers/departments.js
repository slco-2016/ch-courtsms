const Conversations = require('../models/conversations');
const Departments = require('../models/departments');
const DepartmentSupervisors = require('../models/departmentSupervisors');
const PhoneNumbers = require('../models/phoneNumbers');
const Users = require('../models/users');


module.exports = {

  alter(req, res) {
    const state = req.params.case !== 'close';

    Departments.findMembers(req.params.department)
    .then((members) => {
      if (members.length == 0) {
        Departments.alterCase(req.params.department, state)
        .then(() => {
          req.flash('success', 'Changed department activity status.');
          res.redirect('/org/departments');
        }).catch(res.error500);
      } else {
        req.flash('warning', 'Need to remove or close out members first.');
        res.redirect('/org/departments');
      }
    }).catch(res.error500);
  },

  create(req, res) {
    Departments.create(
                  req.user.org,    // organization
                  req.body.name,   // new dep't name
                  req.body.number, // associated number
                  req.user.cmid,    // created by
    ).then(() => {
      req.flash('success', 'Made new department.');
      res.redirect('/org/departments');
    }).catch(res.error500);
  },

  edit(req, res) {
    const departmentId = req.params.department;
    const orgId = req.user.org;
    Departments.findById(departmentId)
    .then((department) => {
      if (department) {
        PhoneNumbers.findByOrgID(orgId)
        .then((phoneNumbers) => {
          res.render('departments/edit', {
            department,
            phoneNumbers,
          });
        }).catch(res.error500);
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  index(req, res) {
    const status = req.query.status !== 'inactive';

    Departments.findByOrg(req.user.org, status)
    .then((departments) => {
      res.render('departments/index', {
        hub: {
          tab: 'departments',
          sel: status ? 'active' : 'inactive',
        },
        departments,
      });
    }).catch(res.error500);
  },

  new(req, res) {
    PhoneNumbers.findByOrgID(req.user.org)
    .then((phoneNumbers) => {
      res.render('departments/create', {
        phoneNumbers,
      });
    }).catch(res.error500);
  },

  supervisorsIndex(req, res) {
    let supervisors;
    DepartmentSupervisors.findByDepartmentIDs(req.params.department)
    .then((resp) => {
      supervisors = resp;

      // Limit options to only users already added to the department
      // This is a "promote from within" concept
      return Users.where({
        org: req.user.org,
        department: Number(req.params.department),
        active: true,
      });
    }).then((users) => {
      // Just sorting by last name here
      const members = users.sort((a, b) => a.last > b.last);

      res.render('departments/supervisors', {
        departmentId: req.params.department,
        supervisors,
        members,
      });
    }).catch(res.error500);
  },

  supervisorsUpdate(req, res) {
    if (!Array.isArray(req.body.supervisorIds)) req.body.supervisorIds = [req.body.supervisorIds,];

    DepartmentSupervisors.updateSupervisors(
      req.params.department,
      req.body.supervisorIds,
      req.body.revertClass,
    ).then(() => {
      req.flash('success', 'Updated department supervisors.');
      res.redirect('/org/departments');
    }).catch(res.error500);
  },

  update(req, res) {
    Departments.editOne(
      req.params.department, // department
      req.body.name,           // new name
      req.body.number,          // new associated number
    ).then(() => {
      req.flash('success', 'Updated department.');
      res.redirect('/org/departments');
      return null;
    }).catch(res.error500);
  },

};
