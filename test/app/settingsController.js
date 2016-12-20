const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Clients = require('../../app/models/clients');
const Users = require('../../app/models/users');

const primary = supertest.agent(APP);

const client = {
  email: 'primary@test.com',
};
const numberOfClientToCreate = 4;

let reqBody = {
  cmid: null,
  first:
  req.body.first, 
  req.body.middle, 
  req.body.last, 
  req.body.email,
  alertFrequency,
  isAway,
  awayMessage,
  alertBeep,
  automatedNotificationsAllowed
};

describe('Settings controller view', function() {

  before(function(done) {
    primary.post('/login')
      .send({email: client.email, })
      .send({pass:'123', })
      .expect(302)
      .expect('Location', '/')
      .then(() => {

        // We need to add some clients here
        // so that this user has clients to update
        Users.findOneByAttribute({email: client.email})
        .then((user) => {
          const cmid = user.cmid;
          const allNewClients = Array.from(Array(numberOfClientToCreate).keys()).map((ea) => {
            return {
              userId: cmid,
              first: `foo_${ea}`,
              middle: `ka_${ea}`,
              last: `bar_${ea}`,
              first: `foo_${ea}`,
              dob: `0${ea + 1}/12/1990`,
              otn: ea*100,
              so: ea*140,
            };
          });

          return allNewClients;
        }).map((client) => {
          return Clients.create(client.userId, 
                                client.first, 
                                client.middle, 
                                client.last, 
                                client.dob, 
                                client.otn, 
                                client.so);
        }).then(() => {
          done();
        }).catch(done);
      });
  });

  it('should be able to view own settings', function(done) {
    primary.get('/settings')
      .expect(200)
    .end(function(err, res) {
      const email = new RegExp(client.email);
      res.text.should.match(email);
      res.text.should.match(/<input type="radio" value="ignore" name="toggleAutoNotify" checked>/);
      // there are 2 clients created by default in the seed table (see seeds.js)
      res.text.should.match(RegExp(`<strong>${numberOfClientToCreate + 2}<\/strong> clients receiving notifications<br>`));
      res.text.should.match(/<strong>0<\/strong> clients <strong>not<\/strong> receiving notifications/);
      done();
    });
  });

  it('should be able to toggle all client notifications off', function(done) {
    Users.findOneByAttribute({email: client.email})
    .then((user) => {
      const reqBody = {
        cmid: user.cmid,
        first: user.first,
        middle: user.middle,
        last: user.last,
        email: user.email,
        alertFrequency: user.email_alert_frequency,
        isAway: user.is_away,
        awayMessage: user.away_message,
        alertBeep: user.alert_beep,
        toggleAutoNotify: 'none',
      };
      primary.post('/settings')
        .send(reqBody)
        .expect(200)
      .end(function(err, res) {
        done(err);
      });
    });

  }); 

  // it('should be able to submit edits on own settings', function(done) {
  //   primary.get('/settings')
  //     .expect(200)
  //   .end(function(err, res) {
  //     const email = new RegExp(client.email);
  //     res.text.should.match(email);
  //     done();
  //   });
  // });

});