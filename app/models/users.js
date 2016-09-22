'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

// Utilities
const BaseModel = require("../lib/models").BaseModel
const bcrypt = require("bcrypt-nodejs");


const CommConns = require("./commConns");


// Class
class Users extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        "cmid","org", "first",
        "last","email","position",
        "admin","active","superuser",
        "class","department"
      ],
    })
  }

  static returnUserIdFromResponse(res) {

  }

  static findByOrg (orgID, activeStatus) {
    if (typeof activeStatus == "undefined") activeStatus = true;

    return new Promise((fulfill, reject) => {
      db("cms")
        .select("cms.*", "departments.name as department_name")
        .leftJoin("departments", "departments.department_id", "cms.department")
        .where("cms.org", orgID)
        .andWhere("cms.active", activeStatus)
        .orderBy("cms.last", "asc")
      .then((users) => {
        fulfill(users);
      }).catch(reject);
    });
  }

  static findAllByDepartment (departmentID) {
    return new Promise((fulfill, reject) => {
      var allUsers;
      Users.findByDepartment(departmentID, true)
      .then((users) => {
        allUsers = users;
        return Users.findByDepartment(departmentID, false)
      }).then((users) => {
        fulfill(allUsers.concat(users));
      }).catch(reject);
    })
  }

  static findByDepartment (departmentID, activeStatus) {
    if (typeof activeStatus == "undefined") activeStatus = true;
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("department", departmentID)
        .andWhere("active", activeStatus)
        .orderBy("last", "asc")
      .then((users) => {
        fulfill(users);
      }).catch(reject);
    })
  }

  static findById (user) {
    return new Promise((fulfill, reject) => {
      db("cms")
        .select("cms.*", "departments.name as department_name")
        .leftJoin("departments", "departments.department_id", "cms.department")
        .where("cms.cmid", user)
        .limit(1)
      .then((users) => {
        fulfill(users[0]);
      }).catch(reject);
    });
  }

  static changeActivityStatus (user, status) {
    if (typeof status == "undefined") status = false;
    
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("cmid", user)
        .update({ active: status })
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }

  static createOne (first, middle, last, email, orgID, department, position, className) {
    const passwordString = Math.random().toString(36).slice(-5);
    const hashedPW = bcrypt.hashSync(passwordString, bcrypt.genSaltSync(8), null);
    return new Promise((fulfill, reject) => {
      Users.findByEmail(email)
      .then((user) => {
        if (user) {
          reject("Email already exists");
        } else {
          return db("cms")
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
                    active: true
                  })
        }
      }).then(() => {
        fulfill(passwordString);
      }).catch(reject);
    })
  }

  static transferOne (targetUserID, department) {
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("cmid", targetUserID)
        .update({
          department: department,
          updated: db.fn.now()
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }

  static updateOne (targetUserID, first, middle, last, email, department, position, className) {
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("cmid", targetUserID)
        .update({
          first: first,
          middle: middle,
          last: last,
          email: email,
          department: department,
          position: position,
          class: className,
          updated: db.fn.now()
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }
  
}

Users.primaryId = "cmid"
Users.tableName = "cms"

module.exports = Users;