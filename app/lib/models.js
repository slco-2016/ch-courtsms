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

  static create(modelObject) {
    return new Promise((fulfill, reject) => {
      db(this.tableName)
      .insert(this._cleanParams(modelObject)).returning("*")
      .then((objs) => {
        this._getSingleResponse(objs, fulfill)
      }).catch(reject)
    })
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

  static _getMultiResponse(objects, fulfill, model) {
    if (!model) {
      model = this
    }
    
    fulfill(objects.map((object) => {
      return new model(object);
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

  static findById (id) {
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

  static findByIds (ids) {
    return new Promise((fulfill, reject) => {
      db(this.tableName)
        .whereIn(this.primaryId, ids)
        .then((objects) => {
          this._getMultiResponse(objects, fulfill)
        }).catch(reject)
    })

  }

  static findOneByAttribute(attributeName, value) {
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
    return this.findOneByAttribute('email', email)
  }

}

module.exports = {
  undefinedValuesCheck: undefinedValuesCheck,
  BaseModel: BaseModel,
}