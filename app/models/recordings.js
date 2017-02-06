

const db = require('../../app/db');
const Promise = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;

const s3 = require('../lib/s3');

class Recordings extends BaseModel {
  constructor(data) {
    super({
      data,
      columns: [
        'id',
        'comm_id',
        'delivery_date',
        'recording_key',
        'RecordingSid',
        'created',
        'updated',
        'transcription',
        'call_to',
      ],
    });
  }
  getUrl() {
    return s3.getTemporaryUrl(this.recording_key);
  }
}

Recordings.primaryId = 'id';
Recordings.tableName = 'recordings';

module.exports = Recordings;
