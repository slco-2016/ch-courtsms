const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const Communications = require('../../app/models/communications');

const owner = supertest.agent(APP)
const notLoggedInAccount = supertest.agent(APP)

const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')

describe('Dashboard View', function() {

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
  });

  it('dashboard should be accessible to owner', function(done) {
    owner.get('/org')
      .expect(200)
      .end(function(err, res) {
        done();
      })
  });

  it('dashboard should be not be publicly accessible', function(done) {
    notLoggedInAccount.get('/org')
      .expect(302)
      .expect("Location", "/login")
      .end(function(err, res) {
        done();
      })
  });

  it('dashboard filter by department', function(done) {
    owner.get('/org?department=1')
      .expect(200)
      .end(function(err, res) {
        done();
      })
  });

  it('dashboard filter by user', function(done) {
    owner.get('/org?user=1')
      .expect(200)
      .end(function(err, res) {
        done();
      })
  });

  // TODO: can we check for runtime errors when loading the page 
  // and generating the C3js charts?

})