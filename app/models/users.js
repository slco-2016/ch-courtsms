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
        'cmid','org', 'first',
        'last','email','position',
        'admin','active',
        'superuser',
        'class','department', 
        'is_away', 'away_message', 'email_alert_frequency',
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
    return new Promise((fulfill, reject) => {
      db('clients')
        .where('cm', this.cmid)
      .then((users) => {
        const Clients = require('../models/clients');
        this.constructor._getMultiResponse(users, fulfill, Clients);
      });
    });
  }

  static getPerformanceComparedToTopInOrganizationThisWeek (userId) {
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
        if (topThisWeek == 0) {
          fulfill(0);
        } else if (usersCount == 0) {
          fulfill(0);
        } else {
          let percent = Math.round(usersCount * 100 / topThisWeek);
          fulfill(Math.min(100, percent));
        }
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

  static findByClientId (clientId) {
    return new Promise((fulfill, reject) => {
      db('clients')
        .where('clid', clientId)
      .then((clients) => {
        const client = clients[0];
        return db('cms')
          .where('cmid', client.cm);
      }).then((users) => {
        this._getSingleResponse(users, fulfill);
      }).catch(reject);
    });
  }

  static findByClientCommEmail(email) {
    return new Promise((fulfill, reject) => {
      // joanne@slco.org => joanne.slco@clientcomm.org
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

  static findByOrg (orgID, activeStatus) {
    if (typeof activeStatus == 'undefined') activeStatus = true;

    return new Promise((fulfill, reject) => {
      db('cms')
        .select('cms.*', 'departments.name as department_name')
        .leftJoin('departments', 'departments.department_id', 'cms.department')
        .where('cms.org', orgID)
        .andWhere('cms.active', activeStatus)
        .orderBy('cms.last', 'asc')
      .then((users) => {
        fulfill(users);
      }).catch(reject);
    });
  }

  static findAllByDepartment (departmentID) {
    return new Promise((fulfill, reject) => {
      let allUsers;
      Users.findByDepartment(departmentID, true)
      .then((users) => {
        allUsers = users;
        return Users.findByDepartment(departmentID, false);
      }).then((users) => {
        fulfill(allUsers.concat(users));
      }).catch(reject);
    });
  }

  static findByDepartment (departmentID, activeStatus) {
    if (typeof activeStatus == 'undefined') activeStatus = true;
    return new Promise((fulfill, reject) => {
      db('cms')
        .where('department', departmentID)
        .andWhere('active', activeStatus)
        .orderBy('last', 'asc')
      .then((users) => {
        fulfill(users);
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

  static changeActivityStatus (user, status) {
    if (typeof status == 'undefined') status = false;
    
    return new Promise((fulfill, reject) => {
      db('cms')
        .where('cmid', user)
        .update({ active: status, })
      .then(() => {
        fulfill();
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