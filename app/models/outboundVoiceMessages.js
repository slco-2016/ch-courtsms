'use strict';

const db      = require("../../app/db");
const Promise = require("bluebird");

const BaseModel = require("../lib/models").BaseModel

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
}

OutboundVoiceMessages.primaryId = "id"
OutboundVoiceMessages.tableName = "outbound_voice_messages"

module.exports = OutboundVoiceMessages