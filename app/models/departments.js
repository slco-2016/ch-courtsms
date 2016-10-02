'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel;

const DepartmentSupervisors = require("./departmentSupervisors");

class Departments extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        "department_id",
        "organization",
        "name",
        "phone_number",
        "created_by",
        "active",
        "created"
      ]
    })
  }

  static alterCase (departmentID, active) {
    if (typeof active == "undefined") active = true;

    return new Promise((fulfill, reject) => {
      db("departments")
        .where("department_id", departmentID)
        .update({active: active})
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static createOne (orgID, name, phoneNumber, userID) {
    return new Promise((fulfill, reject) => {
      db("departments")
        .insert({
          organization: orgID,
          name: name,
          phone_number: phoneNumber,
          created_by: userID,
          active: true
        })
      .then(() => {
        fulfill()
      }).catch(reject);
    });
  }

  static editOne (departmentID, name, phoneNumber) {
    return new Promise((fulfill, reject) => {
      db("departments")
        .where("department_id", departmentID)
        .update({
          name: name,
          phone_number: phoneNumber
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static findByConversationId (conversationId) {
    let Conversations = require("./conversations");
    let Users = require("./users");

    return new Promise((fulfill, reject) => {
      Conversations.findById(conversationId)
      .then((conversation) => {
        let userId = conversation.cm;
        return Users.findById(userId);
      }).then((user) => {
        let departmentId = user.department;
        return Departments.findById(departmentId)
      }).then((departments) => {
        fulfill(departments);
      }).catch(reject);
    });
  }

  static findByMember (user) {
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("cmid", user)
      .then((members) => {
        let member = members[0];

        if (member) {
          let departmentId = member.department;
          Departments.findById(departmentId)
          .then((department) => {
            fulfill(department);
          }).catch(reject);

        } else {
          fulfill();
        }
      }).catch(reject);
    });
  }

  static findMembers (departmentID) {
    return new Promise((fulfill, reject) => {
      db("cms")
        .where("department", departmentID)
        .andWhere("active", true)
      .then((members) => {
        fulfill(members);
      }).catch(reject);
    });
  }

  static findByOrg (orgID, activeStatus) {
    if (typeof activeStatus == "undefined") activeStatus = true;
    return new Promise((fulfill, reject) => {
      var departmentsAll;
      db("departments")
        .select("departments.*", 
                "phone_numbers.value", 
                "member_counts.members",
                "cms.first as created_by_first",
                "cms.middle as created_by_middle",
                "cms.last as created_by_last")
        .leftJoin(
          db("cms")
            .select(db.raw("COUNT(*) AS members"), "department")
            .where("cms.active", true)
            .groupBy("department")
            .as("member_counts"),
          "member_counts.department", "departments.department_id")
        .leftJoin(
          db("cms")
            .where("cms.active", true)
            .as("cms"), 
          "cms.cmid", "departments.created_by")
        .leftJoin("phone_numbers", "phone_numbers.phone_number_id", "departments.phone_number")
        .where("departments.organization", orgID)
        .andWhere("departments.active", activeStatus)
        .orderBy("departments.name", "asc")
      .then((departments) => {
        departmentsAll = departments;
        const departmentIDs = departments.map(function (department) {
          return department.department_id;
        });
        return DepartmentSupervisors.findByDepartmentIDs(departmentIDs, true)
      }).then((supervisors) => {
        departmentsAll = departmentsAll.map(function (department) {
          department.supervisors = [];
          supervisors.forEach(function (supervisor) {
            if (supervisor.department == department.department_id) {
              department.supervisors.push(supervisor);
            }
          });
          return department;
        });
        fulfill(departmentsAll)
      }).catch(reject);
    })
  }

  static findByPhoneNumber (value) {
    return new Promise((fulfill, reject) => {
      db("departments")
        .leftJoin("phone_numbers", "phone_numbers.phone_number_id", "departments.phone_number")
        .where("active", true)
        .andWhere("phone_numbers.value", value)
      .then((departments) => {
        return fulfill(departments);
      }).catch(reject);
    });
  }
  
}

Departments.primaryId = "department_id";
Departments.tableName = "departments";
module.exports = Departments;