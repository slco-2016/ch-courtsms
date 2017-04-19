const CloseoutSurveys = require('../models/closeoutSurveys');
const Departments = require('../models/departments');
const Users = require('../models/users');
const Messages = require('../models/messages');

// assistance libraries
const libUser = require('../lib/users');
const analyticsService = require('../lib/analytics-service');
const moment = require('moment');
const momentTz = require('moment-timezone');

module.exports = {

  org(req, res) {
    analyticsService.track(null, 'org_view', req, res.locals, {});

    // originally we assume that the individual can see
    // all the departments (originally departmentFilter)
    let departmentFilter = null;
    // same goes for the users as well
    let userFilter = null;

    // other variables to be reference later
    let departments;
    let users;
    let userToFilterBy;
    let countsByDay;
    let countsByWeek;

    // Logic tree for determining whether to filter by department:
    // if you have a department assigned to yourself, you should limit
    // except if you are a owner or support
    // if you don't have that, then look at the query parameter (case of owner drilling down)
    // otherwise null (assume you can view all)

    if (req.user.class !== 'owner' && req.user.class !== 'support') {
      departmentFilter = req.user.department;
    } else if (req.query.hasOwnProperty('department') && !isNaN(req.query.department)) {
      departmentFilter = Number(req.query.department);
    }

    // Do we want to filter by a user instead?
    // A user will "trump" a department
    userFilter = req.query.user || null;

    // Start by finding all departments in that organization that are currently active
    // true states active status is "true"
    Departments.findByOrg(req.user.org, true)
    .then((resp) => {
      // set the reference variable from up top
      departments = resp;

      // filter by departments if a userFilter is specified
      if (userFilter) {
        return Users.findOneByAttribute('cmid', userFilter);
      }
      return new Promise((fulfill, reject) => {
        fulfill(null);
      });
    }).then((resp) => {
      userToFilterBy = resp;

      // user filter trump card, pre-empts the departmentFilter setting prior
      if (userToFilterBy) {
        departmentFilter = userToFilterBy.department;
      } else {
        userToFilterBy = null;
        userFilter = null;
      }

      // we use the special library because we want the department
      // name with each resulting user
      return libUser.findByOrgWithDepartmentNameAndNoInfoTag(req.user.org, true);
    }).then((resp) => {
      // set the reference variable from up top
      users = resp;

      if (departmentFilter) {
        // limit the number of department options
        // that are returned to the only one allowed
        departments = departments.filter(department => department.department_id === departmentFilter);

        // also remove all users who are not in that department
        users = users.filter(user => user.department === departmentFilter);
      }

      // after filtering by department, also make sure only
      // if userToFilterBy is not null, then we want to filter for only
      // the department that the user has as her/his attribute under department
      if (userToFilterBy) {
        departments = departments.filter(department => department.department_id === userToFilterBy.department);

        users = users.filter(eachUser => eachUser.cmid == userFilter);
      }


      // this block determined how we should query for messages
      // whether for all counts by a single user, a department, or an org
      if (userFilter) {
        return Messages.countsByUser(userFilter, 'day');
      } else if (departmentFilter) {
        return Messages.countsByDepartment(departmentFilter, 'day');
      }
      return Messages.countsByOrg(req.user.org, 'day');
    }).then((resp) => {
      countsByDay = resp;

      // this block generate the upper bar in the graph on the dashboard
      if (userFilter) {
        return Messages.countsByUser(userFilter, 'week');
      } else if (departmentFilter) {
        return Messages.countsByDepartment(departmentFilter, 'week');
      }
      return Messages.countsByOrg(req.user.org, 'week');
    }).then((counts) => {
      countsByWeek = counts;

      // change date on weeks to end of week rather than beginning
      // makes it so each data point for a week is associated with the sat
      // at the end of the week rather than the sunday at the beginning
      countsByWeek = countsByWeek.map((ea) => {
        ea.time_period = moment(ea.time_period).add(6, 'days').format('YYYY-MM-DD');
        return ea;
      });

      // this section helps us determine the "top" and "bottom" x users for a week
      // first we want all the user ids we are comparing
      const userIds = users.map(user => user.cmid);

      // now we want to do a Promise map over them, running a query for each
      // TODO: is can we do this with one query instead of 50?
      return new Promise((fulfill, reject) => {
        fulfill(userIds);
      });
    }).map(userId =>

      // this is the query that is being mapped
      // we are looking for how many messages that user has sent this week
      // TODO: We should update this query to only check for this week's performance
      //       if we did that we could drop lines 160 - 177 basically
       Messages.countsByUser(userId, 'week')).then((usersWithMessageCountsList) => {
      // so usersWithMessageCountsList returns an array of counts for all weeks
      // in that users history
      // the below iterates through that and looks for
      // just the results from the current week
      // otherwise it does not push that user into usersWithMessageCounts
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

      // specifically gives you the percentage value for the donut chart in the top right
         return CloseoutSurveys.getSuccessDistributionByOrg(req.user.org);
       }).then((surveySynopsis) => {
         res.render('dashboard/index', {
           hub: {
             tab: 'dashboard',
             sel: null,
           },
           users,
           userFilter: userFilter || null,
           departments,
           departmentFilter: departmentFilter || null,
           countsByDay,
           countsByWeek,
           surveySynopsis,
         });
       }).catch(res.error500);
  },

};
