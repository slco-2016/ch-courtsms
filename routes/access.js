


// DEPENDENCIES
// DB via knex.js to run queries
var db  = require("../app/db");

var uuid = require("node-uuid");
var emUtil = require("../utils/em-notify");

// Utility checks if a client is logged in
var utils = require("../utils/utils.js");
var pass = utils["pass"];
var hashPw = pass.hashPw;
var isLoggedIn = pass.isLoggedIn;



module.exports = function (app, passport) {





  app.get("/stats", function (req, res) {

    var responseData = {
      overall: {}
    }

    var rawQuery0 = " SELECT count(msgid), date_trunc('week', created) AS week " + 
                    " FROM msgs GROUP BY week ORDER BY week ASC; ";
    db.raw(rawQuery0).then(function (weeks) {
      responseData.weeks = weeks.rows;

      var rawQuery1 = " SELECT count(msgid), inbound, trunc(EXTRACT(HOUR FROM created)) AS date_hr " + 
                      " FROM msgs " +
                      " GROUP BY date_hr, inbound " +
                      " ORDER BY date_hr ASC; ";
      return db.raw(rawQuery1)
    }).then(function (msgs) {
      responseData.msgs = msgs.rows;

      var rawQuery2 = "SELECT COUNT(to_char(created, 'dy')), extract(dow FROM created) AS dow FROM msgs GROUP BY dow ORDER BY dow ASC;";
      return db.raw(rawQuery2);
    }).then(function (days) {
      responseData.days = days.rows;

      var rawQuery3 = "SELECT count(msgid) FROM msgs;";
      return db.raw(rawQuery3);
    }).then(function (msgct) {
      responseData.overall.msgs = msgct.rows[0].count;

      var rawQuery4 = "SELECT count(convid) FROM convos WHERE convos.open = TRUE;";
      return db.raw(rawQuery4);
    }).then(function (convosct) {
      responseData.overall.convos = convosct.rows[0].count;

      var rawQuery5 = "SELECT count(clid) FROM clients WHERE clients.active = TRUE;";
      return db.raw(rawQuery5);
    }).then(function (clsct) {
      responseData.overall.clients = clsct.rows[0].count;

      var rawQuery6 = " SELECT sum(count(cmid)) OVER (ORDER BY date_trunc('week', created)), date_trunc('week', created) AS week " + 
                      " FROM cms WHERE active = TRUE AND admin = FALSE GROUP BY week ORDER BY week ASC; ";
      return db.raw(rawQuery6);
    }).then(function (cmcount) {
      responseData.caseManagerWeeklyCounts = cmcount.rows;

      return res.render("public/stats", responseData);
      
    }).catch(function (err) { res.redirect("/500"); });
  });

};



