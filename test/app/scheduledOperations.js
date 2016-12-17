const assert = require('assert');
const supertest = require('supertest');
const request = require('request');

const APP = require('../../app/app');

const Attachments = require('../../app/models/attachments');
const Messages = require('../../app/models/messages');

require('colors');
const should = require('should');

const twilioAgent = supertest.agent(APP);
const smsData = require('../data/testSMSData');

describe('Scheduled operations checks', function() {

  before(function(done) {
    twilioAgent.post('/webhook/sms')
      .send(smsData)
      .set('X-Twilio-Signature', 'Hwg7BlBJGBLRPcRAlKwKlwtQ+q0=')
      .expect(200)
      .end(function(err, res) {
        done();
      });
  });

  it('Check and send email alerts if there are unreads', function(done) {
    require('../../app/lib/em-notify').runEmailUpdates()
    .then(done).catch(done);
  });

  it('Check uncleared messages', function(done) {
    Messages.findNotClearedMessages()
    .then((messages) => {
      // We should have at least one message in there from the seed data
      messages.length.should.be.greaterThan(0);

      const smsStatusCheck = require('../../app/lib/sms-status-check');
      if (!messages.length) done();
      messages.forEach((message, i) => {
        smsStatusCheck.checkMsgAgainstTwilio(message);
        if (i == messages.length - 1) {
          setTimeout(() => { done(); }, 1000);
        }
      });
    }).catch(done);
  });

});