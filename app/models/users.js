'use strict';

// Libraries
const db      = require('../../app/db');
const Promise = require('bluebird');

// Utilities
const BaseModel = require('../lib/models').BaseModel;
const bcrypt = require('bcrypt-nodejs');


const CommConns = require('./commConns');

// Class
class Users extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        'cmid',
        'org', 
        'first',
        'middle',
        'last',
        'email',
        'position',
        'admin',
        'active',
        'superuser',
        'class',
        'department', 
        'is_away', 
        'away_message', 
        'email_alert_frequency',
        'alert_beep', 
        'allow_automated_notifications',
      ],
    });
  }

  static clientCommEmail(email) {
    const parts = email.split('@');

    const emailName = parts[0];

    const domainParts = parts[1].split('.');
    domainParts.pop();
    const emailOrg = domainParts.join('.'); // foo.bar.com

    return `${emailName}.${emailOrg}@clientcomm.org`;
  }

  static getClients() {
    // Returns a list of clients associated with this user.
    // TODO: this is only used in a single test, could possibly
    //       be replaced with findAllByUsers() in the clients model.
    return new Promise((fulfill, reject) => {
      db('clients')
        .where('cm', this.cmid)
      .then((users) => {
        const Clients = require('../models/clients');
        this.constructor._getMultiResponse(users, fulfill, Clients);
      });
    });
  }

  getFullName() {
    return `${this.first} ${this.last}`;
  }

  getClientCommEmail() {
    const rawEmail = this.constructor.clientCommEmail(this.email);
    return `${this.getFullName()} <${rawEmail}>`;
  }

  getPublicObject() {
    let toBeProcessed = new Users(this);
    delete toBeProcessed._info;
    return toBeProcessed;
  }

  static findByClientCommEmail(email) {
    return new Promise((fulfill, reject) => {
      // Example: joanne@slco.org => joanne.slco@clientcomm.org
      const usernameParts = email.split('@')[0].split('.');
      const host = usernameParts.pop();
      const username = usernameParts.join('.');
      let addressPart = username + '@' + host;
      addressPart = addressPart.toLowerCase();
      db('cms')
        .where(db.raw('LOWER(email)'), 'like', `${addressPart}%`)
        .limit(1)
      .then((users) => {
        this._getSingleResponse(users, fulfill);
      }).catch(reject);
    });
  }

  static findById (user) {
    return new Promise((fulfill, reject) => {
      db('cms')
        .select('cms.*', 'departments.name as department_name')
        .leftJoin('departments', 'departments.department_id', 'cms.department')
        .where('cms.cmid', user)
        .limit(1)
      .then((users) => {
        this._getSingleResponse(users, fulfill);
      }).catch(reject);
    });
  }

  static findByIds (userIds) {
    return new Promise((fulfill, reject) => {
      db('cms')
        .select('cms.*', 'departments.name as department_name')
        .leftJoin('departments', 'departments.department_id', 'cms.department')
        .whereIn('cms.cmid', userIds)
      .then((users) => {
        fulfill(users);
      }).catch(reject);
    });
  }

  static createOne (first, middle, last, email, orgID, department, position, className) {
    const passwordString = Math.random().toString(36).slice(-5);
    const hashedPW = bcrypt.hashSync(passwordString, bcrypt.genSaltSync(8), null);
    return new Promise((fulfill, reject) => {
      Users.findByEmail(email)
      .then((user) => {
        if (user) {
          reject('Email already exists');
        } else {
          return db('cms')
                  .insert({
                    org: orgID,
                    first: first,
                    middle: middle,
                    last: last,
                    email: email,
                    pass: hashedPW,
                    department: department,
                    position: position,
                    class: className,
                    active: true,
                  });
        }
      }).then(() => {
        fulfill(passwordString);
      }).catch(reject);
    });
  }

  static transferOne (targetUserID, department) {
    return new Promise((fulfill, reject) => {
      db('cms')
        .where('cmid', targetUserID)
        .update({
          department: department,
          updated: db.fn.now(),
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static updateOne (targetUserID, first, middle, last, email, department, position, className) {
    return new Promise((fulfill, reject) => {
      db('cms')
        .where('cmid', targetUserID)
        .update({
          first: first,
          middle: middle,
          last: last,
          email: email,
          department: department,
          position: position,
          class: className,
          updated: db.fn.now(),
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
}

Users.primaryId = 'cmid';
Users.tableName = 'cms';

module.exports = Users;