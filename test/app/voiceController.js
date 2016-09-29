const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const OutboundVoiceMessages = require('../../app/models/clients');

const twilioAgent = supertest.agent(APP)

const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')

describe('Voice reqs', function() {

  xit('should accept a new voice recodring', function(done) {
    this.timeout(6000)
    let params = "?userId=2&clientId=1"
    params += `&deliveryDate=${new Date().getTime()}`
    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

})