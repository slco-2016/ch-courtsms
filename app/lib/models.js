'use strict';
const Promise = require("bluebird");
const db = require("../../app/db");

function undefinedValuesCheck (array) {
  var undefinedExists = false;

  array.forEach(function (ea) {
    if (typeof ea == "undefined") undefinedExists = true;
  });

  return undefinedExists;
}

class BaseModel {
  constructor(info) {

    this._info = info

    info.columns.map(name => {
      this[name] = info.data[name]
    })
  }

  static _cleanParams(obj) {
    let out = {};
    let instance = new this({});
    let columnNames = instance._info.columns;
    for (let i=0; i < columnNames.length; i++) {
      if (obj[columnNames[i]]) {
        out[columnNames[i]] = obj[columnNames[i]]        
      }
    }
    return out
  }

  static _checkModelValidity() {
    this._checkForTableName()
    this._checkForPrimaryId()
  }

  static _checkForTableName() {
      if(!this.tableName) {
        throw new Error("This model needs a tableName!")
      }
  }

  static _checkForPrimaryId() {
      if(!this.primaryId) {
        throw new Error("This model needs a primaryId!")
      }
  }

  static _getSingleResponse(objects, fulfill) {
    if (!objects || objects.length === 0) {
      fulfill(null)
    } else {
      // return class instance
      let instance = new this(objects[0])
      fulfill(instance)
    }
  }

  static _getMultiResponse(objects, fulfill) {
    fulfill(objects.map((object) => {
      return new this(object)
    }))
  }

  static findByID (id) {
    this._checkModelValidity()
    return new Promise((fulfill, reject) => {
      db(this.tableName)
      .where(this.primaryId, id)
      .limit(1)
      .then((objects) => {
        return this._getSingleResponse(objects, fulfill, reject)
      }).catch(reject)
    })
  }

  static findByAttribute(attributeName, value) {
    this._checkModelValidity()
    return new Promise((fulfill, reject) => {
      db(this.tableName)
      .where(attributeName, value)
      .limit(1)
      .then((objects) => {
        return this._getSingleResponse(objects, fulfill, reject)
      }).catch(reject)
    })

  }

  static findByEmail (email) {
    this._checkForTableName()
    return new Promise((fulfill, reject) => {
      db(this.tableName)
        .where("email", email)
        .limit(1)
      .then((objects) => {
        return this._getSingleResponse(objects, fulfill, reject)
      }).catch(reject);
    })
  }

}

module.exports = {
  undefinedValuesCheck: undefinedValuesCheck,
  BaseModel: BaseModel,
}