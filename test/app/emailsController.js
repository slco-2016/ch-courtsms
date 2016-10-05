const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const Emails = require('../../app/models/emails');
const Messages = require('../../app/models/messages');
const Conversations = require('../../app/models/conversations');
const Communications = require('../../app/models/communications');

const mailgun = require('../../app/lib/mailgun');

const mailgunAgent = supertest.agent(APP)

const emailData = require('../data/testEmailData')
const mailgunWebhookDelivered = require('../data/mailgunWebhookDelivered')
const mailgunWebhookOpen = require('../data/mailgunWebhookOpen')
// request = session(APP)

// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('Email endpoint', function() {

  it('should accept a new email', function(done) {
    mailgunAgent.post('/webhook/email')
      .send(emailData)
      .expect(200)
      .end(function(err, res) {
        if (err) {done(err)}
        let email;
        Emails.findByFrom('max@gmail.com')
        .then((resp) => {
          email = resp
          should.exist(email)          
          return Communications.findByValue('max@gmail.com')
        }).then((comm) => {
          should.exist(comm)
          return Emails.findOneByAttribute('messageId', '<CA+fmJFvSa63JWBZP5SUduG73_7haoO97A@mail.gmail.com>')
        }).then((email) => {
          should.exist(email.messageId)
          return Messages.findOneByAttribute("tw_sid", email.messageId)
        }).then((message) => {
          should.exist(message)
          should.exist(message.convo)
          should.equal(email.id, message.email_id)
          return Conversations.findById(message.convo)
        }).then((conversation) => {
          should.exist(conversation)
          done();
        }).catch(done)
      });
  });

  it('should be able to update email status to opened', function(done) {
    mailgunAgent.post('/webhook/email/status')
      .send(mailgunWebhookOpen)
      .expect(200)
      .end((err, res) => {
        if (err) {done(err)}
        Messages.where({tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>'})
        .then((messages) => {
          should.exist(messages[0])
          messages.forEach((message) => {
            message.tw_status.should.be.exactly('Opened')
          })
          done()
        })
      })
  })

  it('should be able to update email status to delivered', function(done) {
    mailgunAgent.post('/webhook/email/status')
      .send(mailgunWebhookDelivered)
      .expect(200)
      .end((err, res) => {
        if (err) {done(err)}
        Messages.where({tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>'})
        .then((messages) => {
          should.exist(messages[0])
          messages.forEach((message) => {
            message.tw_status.should.be.exactly('Delivered')
          })
          done()
        })
      })
  })

  it.skip('should be able to send an email', function(done) {
    mailgun.sendEmail(
      'max.t.mcdonnell@gmail.com', 
      'test@clientcomm.org',
      "maybe a different subject", "a different body"
    ).then((body) => {
      done();
    }).catch(done)
  })

})