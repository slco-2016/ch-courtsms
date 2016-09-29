'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel

class Emails extends BaseModel{
  constructor(data) {
    super({
      data: data,
      columns: [
        'id',
        'cleanBody',
        'raw',
        'from',
        'to',
        'messageId',
        'created',
      ],
    })
  }
  static findByFrom(from) {
    return this.findOneByAttribute("from", from)
  }
  static create(emailObject) {
    return new Promise((fulfill, reject) => {
      db("emails")
      .insert(this._cleanParams(emailObject)).returning("*")
      .then((emails) => {
        this._getSingleResponse(emails, fulfill)
      }).catch(reject)
    })
  }
}

Emails.primaryId = "cmid"
Emails.tableName = "emails"

module.exports = Emails