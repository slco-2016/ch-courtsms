'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");

// Utilities
const utilities = require("../utilities")
const undefinedValuesCheck = utilities.undefinedValuesCheck;


// TO DOS
// Check if arrays are indeed arrays and that they have length > 0


// Class
class Templates {
  
  static findByUser (userID) {
    return new Promise((fulfill, reject) => {
      db("templates")
        .leftJoin(
          db("template_use")
            .select(db.raw("COUNT(*) as times_used, template"))
            .groupBy("template_use.template")
            .as("template_use"),
          "templates.template_id", "template_use.template")
        .where("casemanager", userID)
        .andWhere("active", true)
        .orderBy("title", "asc")
      .then((templates) => {
        
        templates.forEach(function (template) {
          if (!template.times_used) template.times_used = 0;
        });

        fulfill(templates)
      }).catch(reject);
    })
  }
  
  static findByID (templateID) {
    return new Promise((fulfill, reject) => {
      db("templates")
        .where("template_id", templateID)
      .then((templates) => {
        fulfill(templates[0])
      }).catch(reject);
    })
  }

  static removeOne (templateID) {
    return new Promise((fulfill, reject) => {
      db("templates")
        .update({ active: false })
        .where("template_id", templateID)
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static editOne (templateID, title, content) {
    return new Promise((fulfill, reject) => {
      db("templates")
        .update({
          title: title,
          content: content
        })
        .where("template_id", templateID)
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static insertNew (orgID, userID, title, content) {
    return new Promise((fulfill, reject) => {
      db("templates")
        .insert({
          org: orgID,
          casemanager: userID,
          title: title,
          content: content
        })
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static logUse (templateID, userID, clientID) {
    return new Promise((fulfill, reject) => {
      db("template_use")
        .insert({
          template: templateID,
          used_by: userID,
          sent_to: clientID
        })
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

}

module.exports = Templates