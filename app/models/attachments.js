

const db = require('../../app/db');
const Promise = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;
const s3 = require('../lib/s3');

class Attachments extends BaseModel {

  constructor(data) {
    super({
      data,
      columns: [
        'id',
        'key',
        'filename',
        'created',
        'contentType',
        'email_id',
      ],
    });
  }

  static create(attachmentObject) {
    return new Promise((fulfill, reject) => {
      db('attachments')
      .insert(
        this._cleanParams(attachmentObject)
      ).returning('*')
      .then((attachments) => {
        this._getSingleResponse(attachments, fulfill);
      }).catch(reject);
    });
  }

  static createFromMailgunObject(mailgunObj, email) {
    return new Promise((fulfill, reject) => {
      s3.uploadMailGunAttachment(mailgunObj)
      .then(key => Attachments.create({
        key,
        contentType: mailgunObj['content-type'],
        email_id: email.id,
      })).then(fulfill).catch(reject);
    });
  }

  getUrl() {
    return s3.getTemporaryUrl(this.key);
  }

}

Attachments.primaryId = 'id';
Attachments.tableName = 'attachments';

module.exports = Attachments;
