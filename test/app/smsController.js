const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Emails = require('../../app/models/emails');
const Capture = require('../../app/models/capture');
const CommConns = require('../../app/models/commConns');
const Communications = require('../../app/models/communications');
const Conversations = require('../../app/models/conversations');
const Messages = require('../../app/models/messages');

const twilioAgent = supertest.agent(APP);
const smsData = require('../data/testSMSData');

describe('Sms inbound message endpoint', function() {

  it('should accept a new text', function(done) {
    twilioAgent.post('/webhook/sms')
      .send(smsData)
      .set('X-Twilio-Signature', 'Hwg7BlBJGBLRPcRAlKwKlwtQ+q0=')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

  it('should not accept an unsigned new text', function(done) {
    twilioAgent.post('/webhook/sms')
      .send(smsData)
      .expect(403)
      .end(function(err, res) {
        done(err);
      });
  });

  it('twilio sends an sms from an brand new number', function(done) {
    const newSmsBody = smsData;
    newSmsBody.From = '10008384828';
    twilioAgent.post('/webhook/sms')
      .send(newSmsBody)
      .set('X-Twilio-Signature', 'K22KSNtyW4+G5tGbpzBm+u9DnQU=')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

  it('twilio sends an sms from that same new number again', function(done) {
    const newSmsBody = smsData;
    newSmsBody.From = '10008384828';
    twilioAgent.post('/webhook/sms')
      .send(newSmsBody)
      .set('X-Twilio-Signature', 'K22KSNtyW4+G5tGbpzBm+u9DnQU=')
      .expect(200)
      .end(function(err, res) {
        Conversations.findByCommunicationValue('10008384828')
        .then((conversations) => {
          // both messages should have been placed in the same new captured conversation
          conversations.length.should.be.exactly(1);
          return Messages.findByConversation(conversations[0]);
        }).then((messages) => {
          // Both messages should be in that conversation
          messages.length.should.be.exactly(2);
          done(err);
        });
      });
  });

  it('twilio sends an an sms to an existing number', function(done) {
    const newSmsBody = smsData;
    newSmsBody.From = '12033133609';

    // this is the number that is assoc. with main department in seed
    newSmsBody.To = '12435678910';

    CommConns.findByValue(newSmsBody.From)
    .then((commConns) => {
      // We seeded two connections so those should hold
      commConns.length.should.be.exactly(2);

      twilioAgent.post('/webhook/sms')
        .send(newSmsBody)
        .set('X-Twilio-Signature', '7lwIhNW7ASn7qZKq0Hhs0rIQ1a4=')
        .expect(200)
        .end(function(err, res) {
          Conversations.findByCommunicationValue(newSmsBody.From)
          .then((conversations) => {
            conversations.forEach((conversation) => {
              // We should not have any new capture board convos
              conversation.cm.should.not.be.exactly(null);
              conversation.client.should.not.be.exactly(null);
            });
            done(err);
          }).catch(done);
        });
    }).catch(done);

  });

  it('claim the conversation with one case manager so it closes for all others', function(done) {
    const newSmsBody = smsData;
    newSmsBody.From = '12033133609';

    // this is the number that is assoc. with main department in seed
    newSmsBody.To = '12435678910';

    Conversations.findByCommunicationValue(newSmsBody.From)
    .then((conversations) => {
      // just take the first one
      const conversation = conversations[0];
      const userId = conversation.cm;
      const clientId = conversation.client;
      const conversationId = conversation.convid;
      Capture.associateConversation(userId,
                                    clientId,
                                    conversationId)
      .then(() => {
        Conversations.findByCommunicationValue(newSmsBody.From)
        .then((conversations) => {
          conversations = conversations.filter((conversation) => {
            return conversation.accepted == true;
          });
          conversations.length.should.be.exactly(1);
          done();
        });
      }).catch(done);
    });

  });

});
