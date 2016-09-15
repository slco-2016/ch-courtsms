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
class ColorTags {

  static selectAllByUser (userID) {
    return new Promise((fulfill, reject) => {
      db("color_tags")
        .where("created_by", userID)
        .andWhere("active", true)
        .orderBy("name", "asc")
      .then((colorTags) => {
        fulfill(colorTags)
      }).catch(reject);
    })
  }

  static addNewColorTag (userID, color, name) {
    return new Promise((fulfill, reject) => {
      db("color_tags")
        .insert({
          name: name,
          color: color,
          created_by: userID,
          active: true
        })
      .then(() => {
        fulfill()
      }).catch(reject);
    })
  }

  static removeColorTag (colorTagID) {
    return new Promise((fulfill, reject) => {
      db("color_tags")
        .update({ active: false })
        .where("color_tag_id", colorTagID)
      .then(() => {
        fulfill();
      }).catch(reject);
    })
  }
  
}

module.exports = ColorTags;