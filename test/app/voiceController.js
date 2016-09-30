const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const OutboundVoiceMessages = require('../../app/models/outboundVoiceMessages');

const twilioAgent = supertest.agent(APP)

const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')

describe('Voice reqs', function() {

  xit('should accept a new voice recording', function(done) {
    this.timeout(6000)
    let params = "?userId=2&clientId=1"
    params += `&deliveryDate=${new Date().getTime()}`
    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
        return OutboundVoiceMessages.findOneByAttribute(
          'RecordingSid', 
          'REde2dd4be0e7a521f8296a7390a9ab21b'
        ).then((ovm) => {
          console.log(ovm)
          should.exist(ovm)
          done()
        }).catch(done)
      });
  });

  xit('should accept a new recording from a known number', function(done) {
    done();
  })

})