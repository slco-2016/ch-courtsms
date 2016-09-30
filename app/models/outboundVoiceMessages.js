'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel

const s3 = require("../lib/s3")

class OutboundVoiceMessages extends BaseModel{
  constructor(data) {
    super({
      data: data,
      columns: [
        'id',
        'client_id',
        'delivery_date',
        'recording_key',
        'RecordingSid',
        'delivered',
        'last_delivery_attempt',
        'created',
        'updated',
      ],
    })
  }
  static getNeedToBeSent() {
    return new Promise((fulfill, reject) => {
      db(this.tableName)
        .where("delivered", false)
        .where(db.raw(`delivery_date < ${db.fn.now()}`))
        .then((ovms) => {
          return this._getMultiResponse(ovms, fulfill)
        }).catch(reject)
    })
  }
  getTemporaryRecordingUrl() {
    return s3.getTemporaryUrl(this.recording_key)
  }
}

OutboundVoiceMessages.primaryId = "id"
OutboundVoiceMessages.tableName = "outbound_voice_messages"

module.exports = OutboundVoiceMessages