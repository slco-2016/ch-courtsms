const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const cheerio = require('cheerio');

const APP = require('../../app/app');

const Communications = require('../../app/models/communications');

const owner = supertest.agent(APP);
const notLoggedInAccount = supertest.agent(APP);

const twilioRecordingRequest = require('../data/twilioVoiceRecording.js');

describe('Dashboard View', () => {
  before((done) => {
    owner.get('/login').end(function(err, res) {
      if (res.status == '302') {
        done();
      } else {
        const $html = cheerio.load(res.text);
        const csrf = $html('input[name=_csrf]').val();

          owner.post('/login')
            .type('form')
            .send({ _csrf: csrf })
            .send({ email: 'owner@test.com' })
            .send({ pass: '123' })
            .expect(302)
            .expect('Location', '/login-success')
            .end((err, res) => {
              done(err);
            }); // end post login
      }
    }); // end get login
  });

  it('dashboard should be accessible to owner', (done) => {
    owner.get('/org')
      .expect(200)
      .end((err, res) => {
        done();
      });
  });

  it('dashboard should be not be publicly accessible', (done) => {
    notLoggedInAccount.get('/org')
      .expect(302)
      .expect('Location', '/login')
      .end((err, res) => {
        done();
      });
  });

  it('dashboard filter by department', (done) => {
    owner.get('/org?department=1')
      .expect(200)
      .end((err, res) => {
        done();
      });
  });

  it('dashboard filter by user', (done) => {
    owner.get('/org?user=1')
      .expect(200)
      .end((err, res) => {
        done();
      });
  });

  // TODO: can we check for runtime errors when loading the page
  // and generating the C3js charts?
});
