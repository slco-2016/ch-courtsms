'use strict';

const db      = require('../../app/db');
const Promise = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;

const Departments = require('./departments');
const Messages = require('./messages');
const Users = require('./users');

class Alerts extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        'alert_id',
        'user',
        'created_by',
        'subject',
        'message',
        'open',
        'created',
      ],
    });
  }

  static closeOne (alertId) {
    return new Promise((fulfill, reject) => {
      db('alerts_feed')
        .where('alert_id', alertId)
        .update({ open: false, })
      .then(fulfill).catch(reject);
    });
  }

  static createForUser (targetUserId, createdByUserId, subject, message) {
    return new Promise((fulfill, reject) => {
      const insert = {
        user: targetUserId,
        created_by: createdByUserId,
        subject: subject,
        message: message,
        open: true,
        created: db.fn.now(),
      };

      db('alerts_feed')
        .insert(insert)
      .then(fulfill).catch(reject);
    });
  }

  static createForDepartment (departmentId, createdByUserId, subject, message) {
    return new Promise((fulfill, reject) => {
      Users.where({
        department: departmentId,
        active: true,
      })
      // Users.findByDepartment(departmentId, active)
      .then((users) => {
        const insert = users.map((user) => {
          return {
            user: user.cmid,
            created_by: createdByUserId,
            subject: subject,
            message: message,
            open: true,
            created: db.fn.now(),
          };
        });

        db('alerts_feed')
          .insert(insert)
        .then(fulfill).catch(reject);
      }).catch(reject);
    });
  }

  static createForOrganization (organizationId, createdByUserId, subject, message) {
    // create alerts for all users in an organization
    // NOTE as of 12/21/2016 there's no user interface that triggers this function,
    //      but you can send a POST request that triggers it.
    return new Promise((fulfill, reject) => {
      Users.where({org: organizationId, active: true, })
      .then((users) => {
        const insert = users.map((user) => {
          return {
            user: user.cmid,
            created_by: createdByUserId,
            subject: subject,
            message: message,
            open: true,
            created: db.fn.now(),
          };
        });

        db('alerts_feed')
          .insert(insert)
        .then(fulfill).catch(reject);
      }).catch(reject);
    });
  }
  
  static findByUser (userId) {
    return new Promise((fulfill, reject) => {
      db('alerts_feed')
        .where('user', userId)
        .andWhere('open', true)
      .then((alerts) => {
        this._getMultiResponse(alerts, fulfill);
      }).catch(reject);
    });
  }

}

Alerts.primaryId = 'alert_id';
Alerts.tableName = 'alerts_feed';
module.exports = Alerts;