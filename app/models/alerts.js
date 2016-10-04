'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel;

const Messages = require("./messages");

class Alerts extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        "alert_id",
        "user",
        "created_by",
        "subject",
        "message",
        "open",
        "created"
      ]
    })
  }
  
  static findByUser (userId) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("user", userId)
        .andWhere("open", true)
      .then((alerts) => {
        return fulfill(alerts);
      }).catch(reject);
    });
  }

  static closeOne (alertId) {
    return new Promise((fulfill, reject) => {
      db("alerts_feed")
        .where("alert_id", alertId)
        .update({ open: false })
      .then(fulfill).catch(reject);
    });
  }

}

Alerts.primaryId = "alert_id";
Alerts.tableName = "alerts_feed";
module.exports = Alerts;