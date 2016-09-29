'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel
const s3 = require("../lib/s3")

class Attachments extends BaseModel {

  constructor(data) {
    super({
      data: data,
      columns: [
        'id',
        'key',
        'created',
      ]
    })
  }

  static create(attachmentObject) {
    return new Promise((fulfill, reject) => {
      db("attachments")
      .insert(
        this._cleanParams(attachmentObject)
      ).returning("*")
      .then((attachments) => {
        this._getSingleResponse(attachments, fulfill)
      }).catch(reject)
    })
  }

  static createFromMailgunObject(mailgunObj, msgid) {
    return new Promise((fulfill, reject) => {
      s3.uploadMailGunAttachment(mailgunObj)
      .then((key) => {
        return Attachment.create({
          key: key,
          contentType: mailgunObj['content-type'],
        })
      }).then(fulfill).catch(reject)
    })
  }

  getUrl() {
    return s3.getTemporaryUrl(this.key)
  }

}

Attachments.primaryId = "id"
Attachments.tableName = "attachments"

module.exports = Attachments