const { baseUrl } = require('../../credentials.js');
const db = require('../../app/db');
const Promise = require('bluebird');

class PublicView {
  static splashData() {
    return new Promise((fulfill, reject) => {
      const responseData = { overall: {} };

      if (baseUrl) {
        responseData.baseUrl = baseUrl;
      } else {
        console.warn(
          `DEPRECATION WARNING: add "baseUrl: 'https://secure.clientcomm.org'" to credentials.js`
        );
        responseData.baseUrl = 'https://secure.clientcomm.org';
      }

      fulfill(responseData);

      const rawQuery0 =
        `SELECT count(msgid), date_trunc('week', created) AS week ` +
        `FROM msgs GROUP BY week ORDER BY week ASC;`;
      db
        .raw(rawQuery0)
        .then(weeks => {
          responseData.weeks = weeks.rows;

          // Get msg counts, grouped by hour and out/inbound
          const rawQuery1 =
            `SELECT COUNT(*), cm, date(msgs.created) FROM msgs ` +
            `INNER JOIN convos ON (convos.convid=msgs.convo) ` +
            `GROUP BY cm, date(msgs.created) ORDER BY DATE DESC;`;
          return db.raw(rawQuery1);
        })
        .then(msgs => {
          const m = {};
          const m2 = {};

          // Make var m a object with counts by dates
          msgs.rows.forEach(ea => {
            if (!m[ea.cm]) {
              m[ea.cm] = {};
            }
            const d = new Date(ea.date);
            ea.date = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join(
              '-'
            );
            m[ea.cm][ea.date] = Number(ea.count);
          });

          // Restructure into a new object with counts converted into an array
          for (const ea in m) {
            const keys = Object.keys(m[ea]).sort(
              (a, b) => new Date(a) - new Date(b)
            );
            m2[ea] = {
              dates: keys,
              vals: keys.map(k => m[ea][k]),
            };
          }

          responseData.msgs = m2;

          // Get msg counts by day of week
          const rawQuery2 =
            `SELECT COUNT(to_char(created, 'dy')), ` +
            `extract(dow FROM created) AS dow ` +
            `FROM msgs GROUP BY dow ORDER BY dow ASC;`;
          return db.raw(rawQuery2);
        })
        .then(days => {
          responseData.days = days.rows;

          // Get total msg count
          const rawQuery3 = 'SELECT count(msgid) FROM msgs;';
          return db.raw(rawQuery3);
        })
        .then(msgct => {
          responseData.overall.msgs = msgct.rows[0].count;

          // Get number of currently active convos
          const rawQuery4 =
            'SELECT count(convid) FROM convos WHERE convos.open = TRUE;';
          return db.raw(rawQuery4);
        })
        .then(convosct => {
          responseData.overall.convos = convosct.rows[0].count;

          // Get number of currently active clients
          const rawQuery5 =
            'SELECT count(clid) FROM clients WHERE clients.active = TRUE;';
          return db.raw(rawQuery5);
        })
        .then(clsct => {
          responseData.overall.clients = clsct.rows[0].count;

          // Get population of case managers over time
          // TO DO: We need to control for the fact that cm might have
          // been active in past but not now
          const rawQuery6 =
            `SELECT sum(count(cmid)) ` +
            `OVER (ORDER BY date_trunc('week', created)), ` +
            `date_trunc('week', created) AS week ` +
            `FROM cms WHERE active = TRUE AND admin = FALSE ` +
            `GROUP BY week ORDER BY week ASC;`;
          return db.raw(rawQuery6);
        })
        .then(cmcount => {
          responseData.caseManagerWeeklyCounts = cmcount.rows;
          fulfill(responseData);
        })
        .catch(reject);
    });
  }
}

module.exports = PublicView;
