

// Libraries
const db = require('../../app/db');
const Promise = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;

class Communications extends BaseModel {

  constructor(data) {
    super({
      data,
      columns: [
        'commid',
        'type',
        'value',
        'description',
        'updated',
        'created',
      ],
    });
  }

  static findById(commID) {
    return new Promise((fulfill, reject) => {
      db('comms')
        .where('commid', commID)
        .limit(1)
      .then((comms) => {
        fulfill(comms[0]);
      })
      .catch(reject);
    });
  }

  static getOrCreateFromValue(value, type) {
    if (!type) { type = 'cell'; }

    return new Promise((fulfill, reject) => {
      this.findByValue(value)
      .then((communication) => {
        if (communication) {
          fulfill(communication);
        } else {
          const description = 'Unknown device';
          return this.create(type, description, value);
        }
      })
      .then(fulfill)
      .catch(reject);
    });
  }

  static findByValue(value) {
    return new Promise((fulfill, reject) => {
      db('comms')
        .whereRaw(`LOWER(??) = LOWER(?)`, ['value', String(value)])
        .limit(1)
      .then((comms) => {
        this._getSingleResponse(comms, fulfill);
      })
      .catch(reject);
    });
  }

  static getUseCounts(clientID, communicationIDArray) {
    return new Promise((fulfill, reject) => {
      db('msgs')
        .select(db.raw('count(msgid), comm'))
        .whereIn('comm', communicationIDArray)
        .groupBy('comm')
      .then((counts) => {
        fulfill(counts);
      }).catch(reject);
    });
  }

  static removeOne(commConnID) {
    return new Promise((fulfill, reject) => {
      db('commconns')
        .where('commconnid', commConnID)
        .update({ retired: db.fn.now() })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static create(type, description, value) {
    return new Promise((fulfill, reject) => {
      db('comms')
      .insert({
        type,
        value,
        description,
      })
      .returning('*')
      .then((comms) => {
        this._getSingleResponse(comms, fulfill);
      }).catch(reject);
    });
  }

}

Communications.primaryId = 'commid';
Communications.tableName = 'comms';
module.exports = Communications;
