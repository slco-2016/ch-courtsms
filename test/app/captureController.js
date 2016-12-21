const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');
const Communications = require('../../app/models/communications');

const owner = supertest.agent(APP);

const twilioAgent = supertest.agent(APP);
const smsData = require('../data/testSMSData');

const createUID = () => {
  return String(Math.random().toString(36).substring(7));
};
const inboundBodyMsg = createUID();

describe('Capture Board view', function() {

  before(function(done) {
    owner.post('/login')
      .type('form')
      .send({email:'owner@test.com', })
      .send({pass:'123', })
      .expect(302)
      .expect('Location', '/')
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          // create a capture board item
          const uniqueSMSid = createUID();
          twilioAgent.post('/webhook/sms')
            .send({
                ToCountry: 'US',
                ToState: 'CA',
                SmsMessageSid: uniqueSMSid,
                NumMedia: '0',
                ToCity: 'SAN DIEGO',
                FromZip: '92131',
                SmsSid: uniqueSMSid,
                FromState: 'CA',
                SmsStatus: 'received',
                FromCity: 'SAN DIEGO',
                Body: inboundBodyMsg,
                FromCountry: 'US',
                To: '12435678910',
                ToZip: '92123',
                NumSegments: '1',
                MessageSid: uniqueSMSid,
                AccountSid: createUID(),
                From: '%2B10945630939',
                ApiVersion: '2010-04-01'
            })
            .set('X-Twilio-Signature', 'Hwg7BlBJGBLRPcRAlKwKlwtQ+q0=')
            .expect(200)
            .end(function(err, res) {
              done(err);
            });
        }
      });
  });

  it('Owner should have permissions to actually view the capture board', function(done) {
    owner.get('/org/captured')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

  it('Owner should be able to see inbound unknown, unclaimed message', function(done) {
    owner.get('/org/captured')
      .expect(200)
      .end(function(err, res) {
        res.text.should.match(RegExp(inboundBodyMsg));
        done(err);
      });
  });

});