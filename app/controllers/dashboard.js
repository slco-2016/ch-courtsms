const Departments = require('../models/departments');
const Users = require('../models/users');
const Messages = require('../models/messages');

module.exports = {

  org(req, res) {
    if (req.user.class == "owner" || req.user.class == "support") {
      req.user.department = null;
    }

    let departments;
    let departmentFilter = req.user.department || req.query.department || null;
    let userFilter = req.query.user || null;
    let users;
    let countsByDay, countsByWeek;

    // Control against the owner being assigned to an department
    if (  (req.user.class == "owner" || req.user.class == "support") && 
          !req.query.department) {
      departmentFilter = null;
    }
    // Hnadles is query is 'department=null'
    if (req.query.department && isNaN(req.query.department)) {
      departmentFilter = null;
    }

    Departments.findByOrg(req.user.org, true)
    .then((depts) => {
      departments = depts;

      if (departmentFilter) {
        if (req.user.department) {
          departments = departments.filter((d) => { 
            return d.department_id === departmentFilter
          });
        }
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