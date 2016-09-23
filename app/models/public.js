'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

class PublicView {

  static splashData () {
    return new Promise((fulfill, reject) => {
      var responseData = { overall: {} };

      var rawQuery0 = " SELECT count(msgid), date_trunc('week', created) AS week " + 
                      " FROM msgs GROUP BY week ORDER BY week ASC; ";
      db.raw(rawQuery0).then(function (weeks) {
        responseData.weeks = weeks.rows;

        // Get msg counts, grouped by hour and out/inbound
        var rawQuery1 = " SELECT COUNT(*), cm, date(msgs.created) FROM msgs INNER JOIN convos ON (convos.convid=msgs.convo) " + 
                        " GROUP BY cm, date(msgs.created) ORDER BY DATE DESC; ";
        return db.raw(rawQuery1)
      }).then(function (msgs) {

        var m = {};
        var m2 = {};

        // Make var m a object with counts by dates
        msgs.rows.forEach(function (ea) {
          if (!m[ea.cm]) { m[ea.cm] = {} }
          var d = new Date(ea.date);
          ea.date = [d.getFullYear(), d.getMonth()+1, d.getDate()].join("-");
          m[ea.cm][ea.date] = Number(ea.count);
        });

        // Restructure into a new object with counts converted into an array
        for (var ea in m) {
          var keys = Object.keys(m[ea]).sort(function (a,b) { return new Date(a) - new Date(b); });
          m2[ea] = {
            dates: keys,
            vals: keys.map(function (k) { return m[ea][k]; })
          }
        };

        responseData.msgs = m2;

        // Get msg counts by day of week
        var rawQuery2 = "SELECT COUNT(to_char(created, 'dy')), extract(dow FROM created) AS dow FROM msgs GROUP BY dow ORDER BY dow ASC;";
        return db.raw(rawQuery2);
      }).then(function (days) {
        responseData.days = days.rows;

        // Get total msg count
        var rawQuery3 = "SELECT count(msgid) FROM msgs;";
        return db.raw(rawQuery3);
      }).then(function (msgct) {
        responseData.overall.msgs = msgct.rows[0].count;

        // Get number of currently active convos
        var rawQuery4 = "SELECT count(convid) FROM convos WHERE convos.open = TRUE;";
        return db.raw(rawQuery4);
      }).then(function (convosct) {
        responseData.overall.convos = convosct.rows[0].count;

        // Get number of currently active clients
        var rawQuery5 = "SELECT count(clid) FROM clients WHERE clients.active = TRUE;";
        return db.raw(rawQuery5);
      }).then(function (clsct) {
        responseData.overall.clients = clsct.rows[0].count;

        // Get population of case managers over time
        // TO DO: We need to control for the fact that cm might have been active in past but not now
        var rawQuery6 = " SELECT sum(count(cmid)) OVER (ORDER BY date_trunc('week', created)), date_trunc('week', created) AS week " + 
                        " FROM cms WHERE active = TRUE AND admin = FALSE GROUP BY week ORDER BY week ASC; ";
        return db.raw(rawQuery6);
      }).then(function (cmcount) {
        responseData.caseManagerWeeklyCounts = cmcount.rows;
        fulfill(responseData);
        
      }).catch(reject);
    });
  }

}

module.exports = PublicView;