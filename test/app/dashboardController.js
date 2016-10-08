const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const Communications = require('../../app/models/communications');

const owner = supertest.agent(APP)

const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')

describe('Voice reqs', function() {

  before(function(done) {
    owner.post('/login')
      .type('form')
      .send({'email':'owner@test.com'})
      .send({'pass':'123'})
      .expect(302)
      .expect('Location', '/')
      .end(function(err, res) {
        done(err);
      });
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