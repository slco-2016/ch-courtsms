const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')

const Emails = require('../../app/models/emails');

const mailgun = supertest.agent(APP)

const emailData = require('../testEmailData')
// request = session(APP)

// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('Email endpoint', function() {

  it('should accept a new email', function(done) {
    mailgun.post('/email')
      .send(emailData)
      .expect(200)
      .end(function(err, res) {
        Emails.findByFrom('max@gmail.com')
        .then((email) => {
          should.exist(email)
          done(err);
        })
      });
  });

})