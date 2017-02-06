

const db = require('../../app/db');
const Promise = require('bluebird');
const BaseModel = require('../lib/models').BaseModel;

const Messages = require('./messages');
const Departments = require('./departments');

class Organizations extends BaseModel {

  constructor(data) {
    super({
      data,
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
  }

  static findOneByPhone(phoneNumber) {
    phoneNumber = phoneNumber.replace(/\D+/g, '');
    return new Promise((fulfill, reject) => {
      Departments.findByPhoneNumber(phoneNumber)
      .then((departments) => {
        if (departments && departments.length) {
          const orgId = departments[0].organization;
          return Organizations.findById(orgId);
        }
        fulfill(null);
      }).then(fulfill).catch(reject);
    });
  }

}

Organizations.primaryId = 'orgid';
Organizations.tableName = 'orgs';

module.exports = Organizations;
