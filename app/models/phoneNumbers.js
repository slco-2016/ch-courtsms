// Libraries
const db = require('../../app/db');
const Promise = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;

class PhoneNumbers extends BaseModel {

  constructor(data) {
    super({
      data,
      columns: [
        'phone_number_id',
        'organization',
        'created',
        'value',
      ],
    });
  }

  static findByOrgID(orgID) {
    return new Promise((fulfill, reject) => {
      db('phone_numbers')
        .where('organization', orgID)
        .then(numbers => {
          fulfill(numbers);
        })
        .catch(reject);
    });
  }
}

PhoneNumbers.primaryId = 'phone_number_id';
PhoneNumbers.tableName = 'phone_numbers';
module.exports = PhoneNumbers;
