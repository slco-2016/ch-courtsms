const CloseoutSurveys = require('../models/closeoutSurveys');
const Departments = require('../models/departments');
const Users = require('../models/users');
const Messages = require('../models/messages');

const messagesLib = require('../lib/messages');
const moment = require('moment');
const momentTz = require('moment-timezone');

module.exports = {

  org(req, res) {
    if (req.user.class == 'owner' || req.user.class == 'support') {
      req.user.department = null;
    }

    let departments;
    let departmentFilter = req.user.department || req.query.department || null;
    const userFilter = req.query.user || null;
    let users;
    let countsByDay, countsByWeek;

    // Control against the owner being assigned to an department
    if (  (req.user.class == 'owner' || req.user.class == 'support') && 
          !req.query.department) {
      departmentFilter = null;
    }
    // Handles is query is 'department=null'
    if (req.query.department && isNaN(req.query.department)) {
      departmentFilter = null;
    }

    Departments.findByOrg(req.user.org, true)
    .then((depts) => {
      departments = depts;

      if (departmentFilter) {
        if (req.user.department) {
          departments = departments.filter((department) => { 
            return department.department_id === departmentFilter;
          });
        }
        return Users.findByDepartment(departmentFilter, true);
      } else {
        return Users.findByOrg(req.user.org, true);
      }
    }).then((resp) => {
      users = resp;

      if (userFilter) {
        users = users.filter((eachUser) => { return eachUser.cmid == userFilter;});
        return Messages.countsByUser(userFilter, 'day');
      } else if (departmentFilter) {
        users = users.filter((eachUser) => { return eachUser.department == departmentFilter;});
        return Messages.countsByDepartment(departmentFilter, 'day');
      } else {
        return Messages.countsByOrg(req.user.org, 'day');
      }
    }).then((counts) => {
      countsByDay = counts;

      if (userFilter) {
        return Messages.countsByUser(userFilter, 'week');
      } else if (departmentFilter) {
        return Messages.countsByDepartment(departmentFilter, 'week');
      } else {
        return Messages.countsByOrg(req.user.org, 'week');
      }
    }).then((counts) => {
      countsByWeek = counts;
      const userIds = users.map((user) => {
        return user.cmid;
      });
      return new Promise ((fulfill, reject) => {
        fulfill(userIds);
      });
    }).map((userId) => {
      return Messages.countsByUser(userId, 'week');
    }).then((usersWithMessageCountsList) => {

      const usersWithMessageCounts = [];
      const now = moment();
      usersWithMessageCountsList.forEach((dates, i) => {
        const pairedUser = users[i];
        pairedUser.week_count = 0;
        let dateCount = null;
        dates.forEach((date) => {
          const test = moment(date.time_period);
          if (now.isSame(test, 'week')) {
            dateCount = date;
          }
        });
        if (dateCount) {
          pairedUser.week_count = Number(dateCount.message_count);
        }
        usersWithMessageCounts.push(pairedUser);
      });
      users = usersWithMessageCounts;

      return CloseoutSurveys.getSuccessDistributionByOrg(req.user.org);
    }).then((surveySynopsis) => {

      res.render('dashboard/index', {
        hub: {
          tab: 'dashboard',
          sel: null,
        },
        users:            users,
        userFilter:       userFilter || null,
        departments:      departments,
        departmentFilter: departmentFilter || null,
        countsByDay:      countsByDay,
        countsByWeek:     countsByWeek,
        surveySynopsis:   surveySynopsis,
      });
    }).catch(res.error500);
  },

};