'use strict';

// Libraries
const db      = require('../../app/db');
const Promise = require('bluebird');



// TO DOS
// Check if arrays are indeed arrays and that they have length > 0


// Class
class ColorTags {

  static selectAllByUser (userId) {
    return new Promise((fulfill, reject) => {
      db('color_tags')
        .where('created_by', userId)
        .andWhere('active', true)
        .orderBy('name', 'asc')
      .then((colorTags) => {
        fulfill(colorTags);
      }).catch(reject);
    });
  }

  static addNewColorTag (userId, color, name) {
    return new Promise((fulfill, reject) => {
      db('color_tags')
        .insert({
          name: name,
          color: color,
          created_by: userId,
          active: true,
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static removeColorTag (colorTagId) {
    return new Promise((fulfill, reject) => {
      db('color_tags')
        .update({ active: false, })
        .where('color_tag_id', colorTagId)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }
  
}

module.exports = ColorTags;