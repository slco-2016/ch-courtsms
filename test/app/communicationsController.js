const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const Communications = require('../../app/models/communications');

const primary = supertest.agent(APP)

const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')

describe('Voice reqs', function() {

  before(function(done) {
    primary.post('/login')
      .send({'email':'primary@test.com'})
      .send({'pass':'123'})
      .expect(302)
      .expect('Location', '/')
      .then(() => {
        done()
      })
  })

  it('should be able to create email type communication', function(done) {
    primary.post('/clients/2/communications/create')
      .send({
        description: "email comm",
        type: "email",
        value: "test@test.com",
      })
      .expect(302)
      .end(function(err, res) {
        Communications.findOneByAttribute('value', 'test@test.com')
        .then((communication) => {
          should.equal(communication.type, "email")
          should.equal(communication.description, "email comm")
          done();
        }).catch(done)
      });
  });

})