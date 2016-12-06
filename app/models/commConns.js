'use strict';

// Libraries
const db        = require('../../app/db');
const Promise   = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;
const Communications = require('../models/communications');


// Class
class CommConns extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        'commconnid',
        'client',
        'comm',
        'name',
        'retired',
        'created',
      ],
    });
  }

  // override standard find by id
  static findById (id) {
    return new Promise((fulfill, reject) => {
      db('commconns')
        .leftJoin('comms', 'comms.commid', 'commconns.comm')
        .where('commconnid', id)
      .then((commConns) => {
        fulfill(commConns[0]);
      }).catch(reject);
    });
  }

  static findByCommId (communicationId) {
    return new Promise((fulfill, reject) => {
      db('commconns')
        .where('comm', communicationId)
        .and.where('retired', null)
      .then((commconns) => {
        fulfill(commconns);
      }).catch(reject);
    });
  }

  static findByValue (value) {
    return new Promise((fulfill, reject) => {
      Communications.findByValue(value)
      .then((communication) => {
        if (communication) {
          const commId = communication.commid;
          return db('commconns')
            .whereNull('retired')
            .andWhere('comm', commId);
        } else {
          fulfill([]);
        }
      }).then((commConns) => {
        this._getMultiResponse(commConns, fulfill);
      }).catch(reject);
    });
  }
  
  static findByClientIdWithCommMetaData (clientId) {
    return new Promise((fulfill, reject) => {
      CommConns.findByClientIdsWithCommMetaData([clientId, ])
      .then((commconns) => {
        fulfill(commconns);
      }).catch(reject);
    });
  }
  
  static findByClientIdsWithCommMetaData (clientIds) {
    return new Promise((fulfill, reject) => {
      db('commconns')
        .leftJoin(
          db('comms')
            .select('comms.commid', 'comms.type', 'comms.value')
            .as('comms'),
          'comms.commid', 'commconns.comm')
        .whereIn('client', clientIds)
        .and.where('retired', null)
      .then((commconns) => {
        fulfill(commconns);
      }).catch(reject);
    });
  }

  static getClientCommunications (clientId) {
    return new Promise((fulfill, reject) => {
      db('commconns')
        .select('commconns.*', 'comms.type', 'comms.value')
        .leftJoin('comms', 'comms.commid', 'commconns.comm')
        .whereNull('retired')
        .andWhere('commconns.client', clientId)
      .then((commConns) => {
        const commConnsIDArray = commConns.map(function (commConn) { 
          return commConn.comm;
        });
        CommConns.getUseCounts(clientId, commConnsIDArray)
        .then((counts) => {
          commConns.map(function (commConn) {
            commConn.useCount = 0;
            counts.forEach(function (count) {
              if (count.comm == commConn.comm) commConn.useCount = count.count;
            });
            return commConn;
          });
          fulfill(commConns);
        }).catch(reject);
      }).catch(reject);
    }); 
  }

  static getUseCounts (clientId, communicationIDArray) {
    return new Promise((fulfill, reject) => {
      db('msgs')
        .select(db.raw('count(msgid), msgs.comm'))
        .leftJoin('convos', 'convos.convid', 'msgs.convo')
        .whereIn('comm', communicationIDArray)
        .andWhere('convos.client', clientId)
        .groupBy('msgs.comm')
      .then((counts) => {
        fulfill(counts);
      }).catch(reject);
    }); 
  }

  static updateCommConnName(commConnId, newName) {
    return new Promise((fulfill, reject) => {
      db('commconns')
        .update({
          name: newName,
        })
        .where('commconnid', commConnId)
      .then(fulfill).catch(reject);
    });
  }

  static create (clientId, type, name, value) {
    return new Promise((fulfill, reject) => {
      Communications.findByValue(value)
      .then((communication) => {
        // if a communication method already exists just create a reference 
        if (communication) {
          db('commconns')
            .insert({
              client: clientId,
              comm: communication.commid,
              name: name,
            })
          .then((success) => { 
            fulfill();
          }).catch(reject);
        } else {
          Communications.create(type, name, value)
          .then((communication) => { 
            db('commconns')
              .insert({
                client: clientId,
                comm: communication.commid,
                name: name,
              })
            .then((success) => { 
              fulfill();
            }).catch(reject);
          }).catch(reject);
        }
        return null;
      }).catch(reject);


    }); 
  }

}

CommConns.primaryId = 'commconnid';
CommConns.tableName = 'commconns';
module.exports = CommConns;