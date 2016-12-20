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
let numberOfPreexistingClients = 0;
let numberOfClientToCreate = 4;

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
        let user;

        Users.findOneByAttribute({email: client.email, })
        .then((resp) => {
          user = resp;

          return Clients.findManyByAttribute('cm', user.cmid);
        }).then((clients) => {
          numberOfPreexistingClients = clients.length;

          const cmid = user.cmid;
          const allNewClients = Array.from(Array(numberOfClientToCreate).keys()).map((ea) => {
            ea = Number(ea) + 1;
            return {
              userId: cmid,
              first: `foo_${ea}`,
              middle: `ka_${ea}`,
              last: `bar_${ea}`,
              first: `foo_${ea}`,
              dob: `0${ea}/12/1990`,
              otn: ea*100,
              so: ea*140,
            };
          });

          return new Promise((fulfill, reject) => {
            fulfill(allNewClients);
          });
        }).map((client) => {
          return Clients.create(client.userId, 
                                client.first, 
                                client.middle, 
                                client.last, 
                                client.dob, 
                                client.otn, 
                                client.so);
        }).then((clients) => {
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
      Users.findOneByAttribute({email: client.email, })
      .then((user) => {
        return Clients.findManyByAttribute('cm', user.cmid);
      }).then((clients) => {
        const totalCount = numberOfClientToCreate + numberOfPreexistingClients;
        totalCount.should.be.exactly(clients.length);
        res.text.should.match(RegExp(`<strong>${totalCount}<\/strong> clients receiving notifications<br>`));
        res.text.should.match(/<strong>0<\/strong> clients <strong>not<\/strong> receiving notifications/);
      }).catch(done);
      done();
    });
  });

  it('should be able to toggle all client notifications off', function(done) {
    Users.findOneByAttribute({email: client.email, })
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
        .expect(302)
      .end(function(err, res) {

        // Now let's query for that same user again
        // but this time make sure that the toggle value 
        // reflects the change that was POSTed
        Users.findOneByAttribute({email: client.email, })
        .then((user) => {
          return Clients.findManyByAttribute({cm: user.cmid, });
        }).then((clients) => {
          let clientNotifications = {on: 0, off: 0, };
          clients.forEach((client) => {
            if (client.allow_automated_notifications) {
              console.log('Client caught: ');
              clientNotifications.on += 1;
            } else {
              clientNotifications.off += 1;
            }
          });

          clientNotifications.on.should.be.exactly(0);
          done(err);
        }).catch(done);
      });
    }).catch(done);
  });

  it('should be able to toggle all client notifications on', function(done) {
    Users.findOneByAttribute({email: client.email, })
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
        toggleAutoNotify: 'all',
      };
      primary.post('/settings')
        .send(reqBody)
        .expect(302)
      .end(function(err, res) {

        // Now let's query for that same user again
        // but this time make sure that the toggle value 
        // reflects the change that was POSTed
        Users.findOneByAttribute({email: client.email, })
        .then((user) => {
          return Clients.findManyByAttribute({cm: user.cmid, });
        }).then((clients) => {
          let clientNotifications = {on: 0, off: 0, };
          clients.forEach((client) => {
            if (client.allow_automated_notifications) {
              clientNotifications.on += 1;
            } else {
              clientNotifications.off += 1;
            }
          });

          clientNotifications.off.should.be.exactly(0);
          done(err);
        }).catch(done);
      });
    }).catch(done);
  });

});