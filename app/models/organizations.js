'use strict';

const db      = require('../../app/db');
const Promise = require('bluebird');
const BaseModel = require('../lib/models').BaseModel;

const Messages = require('./messages');

class Organizations extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        'orgid',
        'name',
        'phone',
        'email',
        'expiration',
        'allotment',
        'created',
        'tz',
      ],
    });
  };
  
}

Organizations.primaryId = 'orgid';
Organizations.tableName = 'orgs';

module.exports = Organizations;