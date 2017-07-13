const assert = require('assert');
const supertest = require('supertest');
const request = require('request');

const APP = require('../../app/app');
const simple = require('simple-mock');
const smsService = require('../../app/lib/sms-service');

const Attachments = require('../../app/models/attachments');
const Messages = require('../../app/models/messages');
const Notifications = require('../../app/models/notifications');

require('colors');
const should = require('should');

const twilioAgent = supertest.agent(APP);
const smsData = require('../data/testSMSData');

describe('Scheduled operations checks', () => {
  before((done) => {
    twilioAgent.post('/webhook/sms')
      .send(smsData)
      .set('X-Twilio-Signature', 'Hwg7BlBJGBLRPcRAlKwKlwtQ+q0=')
      .expect(200)
      .end((err, res) => {
        done();
      });
  });

  it('Check and send email alerts if there are unreads', (done) => {
    require('../../app/lib/em-notify').runEmailUpdates()
      .then(() => done())
      .catch(done);
  });


  it('See if there are any planned notifications to be sent', (done) => {
    simple.mock(smsService, 'sendMessage')
      .resolveWith({ sid: 123, status: 'Success!' });

    Notifications.checkAndSendNotifications()
    .then(() => {
      simple.restore();
      done();
    }).catch(done);
  });

  // TODO: test checking uncleared messages

});
