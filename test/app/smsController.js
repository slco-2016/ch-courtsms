const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Emails = require('../../app/models/emails');
const Communications = require('../../app/models/communications');

const twilioAgent = supertest.agent(APP);
const smsData = require('../testSmsData');

describe('Sms inbound message endpoint', function() {

  it('should accept a new email', function(done) {
    twilioAgent.post('/webhook/sms')
      .send(smsData)
      .expect(200)
      .end(function(err, res) {
        done();
      });
  });

  it('twilio sends an sms from an existing number', function(done) {
    let newSmsBody = smsData;
    newSmsBody.From = "10008384828"
    twilioAgent.post('/webhook/sms')
      .send(newSmsBody)
      .expect(200)
      .end(function(err, res) {
        done(err);
      })
  });

  it('twilio sends an sms from a new number', function(done) {
    let newSmsBody = smsData;
    newSmsBody.From = "18589057365"
    twilioAgent.post('/webhook/sms')
      .send(newSmsBody)
      .expect(200)
      .end(function(err, res) {
        done(err);
      })
  });

})