'use strict';

const db      = require('../db');
const Promise = require('bluebird');
const Users = require('../models/users');

module.exports = {

  getPerformanceComparedToTopInOrganizationThisWeek (userId) {
    // Returns a number from 0-100 representing the passed user's
    // performance relative to the top performer in the user's
    // organization.
    return new Promise((fulfill, reject) => {
      let user;
      Users.findById(userId)
      .then((res) => {
        user = res;

        return db('msgs')
          .select(db.raw('COUNT(msgid) AS count, cms.cmid'))
          .leftJoin('convos', 'convos.convid', 'msgs.convo')
          .leftJoin('cms', 'cms.cmid', 'convos.cm')
          .whereRaw('msgs.created > date_trunc(\'week\', CURRENT_DATE)')
          .and.where('org', user.org)
          .groupBy('cms.cmid')
          .orderBy('count', 'desc');
      }).then((results) => {
        const cmid = user.cmid;
        let topThisWeek = 0;
        let usersCount = 0;
        results.forEach((ea) => {
          ea.count = Number(ea.count);
          if (isNaN(ea.count)) {
            ea.count = 0;
          }

          if (ea.count > topThisWeek) {
            topThisWeek = ea.count;
          }
          if (cmid == ea.cmid) {
            usersCount = ea.count;
          }
        });
        if (topThisWeek === 0) {
          fulfill(0);
        } else if (usersCount === 0) {
          fulfill(0);
        } else {
          let percent = Math.round(usersCount * 100 / topThisWeek);
          fulfill(Math.min(100, percent));
        }
      });
    });
  }

};
