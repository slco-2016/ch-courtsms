const Departments = require('../models/departments');
const Users = require('../models/users');
const Messages = require('../models/messages');

module.exports = {

  org(req, res) {
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
        users = users.filter((departmentUser) => { return departmentUser.department == departmentFilter});
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

      res.render("dashboard/index", {
        hub: {
          tab: "dashboard",
          sel: null
        },
        users:            users,
        userFilter:       userFilter || null,
        departments:      departments,
        departmentFilter: departmentFilter || null,
        countsByDay:      countsByDay,
        countsByWeek:     countsByWeek
      });
    }).catch(res.error500);
  },

};