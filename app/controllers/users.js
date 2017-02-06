const Departments = require('../models/departments');
const Users = require('../models/users');

// assistance libraries
const libEmailer = require('../lib/emailer');
const libUser = require('../lib/users');

module.exports = {

  index(req, res) {
    const status = req.query.status !== 'inactive';
    let department = req.user.department || req.query.departmentId;

    // Controls against a case where the owner would accidentally have a department
    if ((req.user.class == 'owner' || req.user.class == 'support') &&
          !req.query.department) {
      department = null;
    }

    libUser.findByOrgWithDepartmentNameAndNoInfoTag(req.user.org, status)
    .then((users) => {
      // Limit by department if supervisor, or specified in query
      if (department) {
        users = users.filter(user => Number(req.user.department) === Number(user.department));
      }

      res.render('users/index', {
        hub: {
          tab: 'users',
          sel: status ? 'active' : 'inactive',
        },
        users,
      });
    }).catch(res.error500);
  },

  new(req, res) {
    const activeStatus = true;
    Departments.findByOrg(req.user.org)
    .then((departments, activeStatus) => {
      if (req.user.class == 'supervisor') {
        departments = departments.filter(department => department.department_id == req.user.department);
      }
      res.render('users/create', {
        departments,
      });
    }).catch(res.error500);
  },

  create(req, res) {
    Users.findByEmail(decodeURIComponent(req.body.email))
    .then((user) => {
      if (user) {
        req.flash('warning', 'That email already exists in the system.');
        res.redirect('/org/users/create');
      } else {
        Users.createOne(
          req.body.first,
          req.body.middle,
          req.body.last,
          req.body.email,
          req.user.org,
          req.body.department,
          req.body.position,
          req.body.className
        ).then((generatedPass) => {
          libEmailer.activationAlert(req.body.email, generatedPass);
          req.flash('success', 'Created new user, sent invite email.');
          res.redirect('/org/users');
        }).catch(res.error500);
      }
      return null;
    }).catch(res.error500);
  },

  check(req, res) {
    Users.findByEmail(decodeURIComponent(req.params.email))
    .then((user) => {
      res.json({ user });
    }).catch(res.error500);
  },

  alter(req, res) {
    // we determine whether we are going to change user attribute active
    // to true or to false
    const udpatedStatus = req.params.case !== 'close';

    Users.findOneByAttribute('cmid', req.params.targetUser)
    .then((user) => {
      if (user) {
        return user.update({ active: udpatedStatus });
      }
        // no user was found so just pass null to the next function
      return null;
    }).then((user) => {
      // if not null then we updated the user successfully
      if (user) {
        req.flash('success', 'Updated user activity state.');
        res.redirect('/org/users');
      } else {
        // otherwise we need to warn the user that it did not work
        req.flash('warning', 'Could not find that user to update.');
        // and then use the res middleware function to redirect to 404
        res.notFound();
      }
    }).catch(res.error500);
  },

  edit(req, res) {
    let departments;
    Departments.findByOrg(req.user.org)
    .then((depts) => {
      departments = depts;
      return Users.findByID(req.params.targetUser);
    }).then((targetUser) => {
      if (targetUser) {
        res.render('users/edit', {
          targetUser,
          departments,
        });
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  update(req, res) {
    if (!req.body.department) {
      req.flash('warning', 'Missing a selected department.');
      res.redirect(req.url);
    } else {
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
        req.flash('success', 'Updated user.');
        res.redirect('/org/users');
      }).catch(res.error500);
    }
  },

  transferIndex(req, res) {
    let departments;
    Departments.findByOrg(req.user.org)
    .then((d) => {
      departments = d;
      return Users.findByID(req.params.targetUser);
    }).then((u) => {
      if (u) {
        res.render('users/transfer', {
          targetUser: u,
          departments,
        });
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  transferUpdate(req, res) {
    Users.transferOne(
      req.params.targetUser,
      req.body.department
    ).then(() => {
      req.flash('success', 'Transfered user.');
      res.redirect('/org/users');
    }).catch(res.error500);
  },
};
