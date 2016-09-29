const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const Emails = require('../../app/models/emails');
const Communications = require('../../app/models/communications');

const mailgun = require('../../app/lib/mailgun');

const mailgunAgent = supertest.agent(APP)

const emailData = require('../data/testEmailData')
// request = session(APP)

// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('Email endpoint', function() {

  it('should accept a new email', function(done) {
    mailgunAgent.post('/email')
      .send(emailData)
      .expect(200)
      .end(function(err, res) {
        Emails.findByFrom('max@gmail.com')
        .then((email) => {
          should.exist(email)          
          return Communications.findByValue('max@gmail.com')
        }).then((comm) => {
          should.exist(comm)
          return Emails.findOneByAttribute('messageId', '<CA+fmJFvSa63JWBZP5SUduG73_7haoO97A@mail.gmail.com>')
        }).then((email) => {
          should.exist(email.messageId)
          done(err);
        }).catch(done)
      });
  });

  xit('should be able to send an email', function(done) {
    mailgun.sendEmail(
      'max.t.mcdonnell@gmail.com', 
      'test@clientcomm.org',
      "maybe a different subject", "a different body"
    ).then((body) => {
      console.log(body)
      done();
    }).catch(done)
  })

})