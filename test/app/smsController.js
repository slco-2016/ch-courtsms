const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Emails = require('../../app/models/emails');
const Communications = require('../../app/models/communications');
const Conversations = require('../../app/models/conversations');
const Messages = require('../../app/models/messages');

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

  it('twilio sends an sms from an existing number again', function(done) {
    let newSmsBody = smsData;
    newSmsBody.From = "10008384828"
    twilioAgent.post('/webhook/sms')
      .send(newSmsBody)
      .expect(200)
      .end(function(err, res) {
        Conversations.findByCommunicationValue("10008384828")
        .then((conversations) => {
          // both messages should have been placed in the same new captured conversation
          conversations.length.should.be.exactly(1);
          return Messages.findByConversation(conversations[0]);
        }).then((messages) => {
          // Both messages should be in that conversation
          messages.length.should.be.exactly(2);
          done(err);
        });
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