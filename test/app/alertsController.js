const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const cheerio = require('cheerio');
const APP = require('../../app/app');
const testClient = supertest.agent(APP);

describe('Alerts controller', () => {
  // login as the primary account
  before(done => {
    testClient.get('/login')
      .end(function(err, res) {
        if (res.status == '302') {
          done();
        } else {
          const $html = cheerio.load(res.text);
          const csrf = $html('input[name=_csrf]').val();

          testClient.post('/login')
            .type('form')
            .send({ _csrf: csrf })
            .send({ email: 'primary@test.com' })
            .send({ pass: '123' })
            .expect(302)
            .expect('Location', '/login-success')
            .end((err, res) => {
              done(err);
            });
        }
      });
  });

  it('returns an accurate summary of unread messages', done => {
    testClient.get('/alerts').expect(200).end((err, res) => {
      should.not.exist(err);
      summary = res.body.newMessageSummary;
      should.exist(summary);

      // from the seed data, we should have two unread messages from
      // two active users, and one unread message from an archived user
      summary.active.messageCount.should.be.exactly(2);
      summary.active.userCount.should.be.exactly(2);
      summary.active.userIds.should.containDeep([3, 2]);
      summary.inactive.messageCount.should.be.exactly(1);
      summary.inactive.userCount.should.be.exactly(1);
      summary.inactive.userIds.should.containEql(4);
      summary.totalUnread.should.be.exactly(3);

      done(err);
    });
  });

  it('updates unread messages summary when messages are read', done => {
    // visit the message stream of one of the clients with unread messages
    testClient.get('/clients/2/messages/').expect(200).end((err, res) => {
      testClient.get('/alerts').expect(200).end((err, res) => {
        summary = res.body.newMessageSummary;
        should.exist(summary);

        // after this view, we should have one unread message from
        // one active user, and one unread message from an archived user
        summary.active.messageCount.should.be.exactly(1);
        summary.active.userCount.should.be.exactly(1);
        summary.active.userIds.should.containEql(3);
        summary.inactive.messageCount.should.be.exactly(1);
        summary.inactive.userCount.should.be.exactly(1);
        summary.inactive.userIds.should.containEql(4);
        summary.totalUnread.should.be.exactly(2);

        done(err);
      });
    });
  });
});
