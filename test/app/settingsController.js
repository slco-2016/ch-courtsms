const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const cheerio = require('cheerio');

const APP = require('../../app/app');

const Clients = require('../../app/models/clients');
const Users = require('../../app/models/users');

const primary = supertest.agent(APP);

const client = {
  email: 'primary@test.com',
};
const superUniqueIdentifier = String(Math.random().toString(36).substring(7));
let numberOfPreexistingClients = 0;
const numberOfClientsToCreate = 4;

describe('Settings controller view', () => {
  before(done => {
    primary.get('/login').end(function(err, res) {
      if (res.status == '302') {
        done();
      } else {
        const $html = cheerio.load(res.text);
        const csrf = $html('input[name=_csrf]').val();

        primary
          .post("/login")
          .type('form')
          .send({ _csrf: csrf })
          .send({ email: client.email })
          .send({ pass: "123" })
          .expect(302)
          .expect("Location", "/login-success")
          .then(() => {
            // add clients so that the user has clients to update
            let user;

            Users.where({ email: client.email })
              .then(resp => {
                user = resp[0];

                return Clients.findManyByAttribute("cm", user.cmid);
              })
              .then(clients => {
                numberOfPreexistingClients = clients.length;

                const cmid = user.cmid;
                const allNewClients = Array.from(
                  Array(numberOfClientsToCreate).keys()
                ).map(ea => {
                  ea = Number(ea) + 1;
                  return {
                    userId: cmid,
                    first: `foo_${ea}_${superUniqueIdentifier}`,
                    middle: `ka_${ea}`,
                    last: `bar_${ea}`,
                    dob: `0${ea}/12/1990`,
                    otn: ea * 100,
                    so: ea * 140
                  };
                });

                return new Promise((fulfill, reject) => {
                  fulfill(allNewClients);
                });
              })
              .map(client =>
                Clients.create(
                  client.userId,
                  client.first,
                  client.middle,
                  client.last,
                  client.dob,
                  client.otn,
                  client.so
                )
              )
              .then(clients => {
                done();
              }).catch(done);
          }); // end login post
      }
    }); // end login get
  }); // end before

  it('should be able to view own settings', (done) => {
    primary.get('/settings')
      .expect(200)
    .end((err, res) => {
      const email = new RegExp(client.email);
      res.text.should.match(email);
      res.text.should.match(/<input type="radio" value="ignore" name="toggleAutoNotify" checked>/);

      // there are 2 clients created by default in the seed table (see seeds.js)
      Users.findOneByAttribute('email', client.email)
      .then(user => Clients.findManyByAttribute('cm', user.cmid)).then((clients) => {
        // we need to handle the fact that some of the seed/other test clients
        // might have been set to other than default so we need to acknowlede that
        const clientNotifications = { all_on: 0, all_off: 0, subset_on: 0, subset_off: 0 };
        clients.forEach((client) => {
          // only check for the clients that we just created
          // ignore clients that might have been created from
          // other tests that were run
          if (client.first.indexOf(superUniqueIdentifier) > -1) {
            if (client.allow_automated_notifications) {
              clientNotifications.subset_on += 1;
            } else {
              clientNotifications.subset_off += 1;
            }
          }
          if (client.allow_automated_notifications) {
            clientNotifications.all_on += 1;
          } else {
            clientNotifications.all_off += 1;
          }
        });

        clientNotifications.subset_off.should.be.exactly(0);
        clientNotifications.subset_on.should.be.exactly(numberOfClientsToCreate);
        res.text.should.match(RegExp(`<strong>${clientNotifications.all_on}</strong> client(s|) receiving notifications<br>`));
        res.text.should.match(RegExp(`<strong>${clientNotifications.all_off}</strong> client(s|) <strong>not</strong> receiving notifications`));
      }).catch(done);
      done();
    });
  });

  it('should be able to toggle all client notifications off', (done) => {
    Users.findOneByAttribute('email', client.email)
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
      primary.get('/settings').end(function(err, res) {
        const $html = cheerio.load(res.text);
        const csrf = $html('input[name=_csrf]').val();

        primary.post('/settings')
          .send({ _csrf: csrf })
          .send(reqBody)
          .expect(302)
        .end((err, res) => {
          // Now let's query for that same user again
          // but this time make sure that the toggle value
          // reflects the change that was POSTed
          Users.findOneByAttribute('email', client.email)
          .then(user => Clients.findManyByAttribute('cm', user.cmid)).then((clients) => {
            const clientNotifications = { on: 0, off: 0 };
            clients.forEach((client) => {
              // only check for the clients that we just created
              // ignore clients that might have been created from
              // other tests that were run
              if (client.first.indexOf(superUniqueIdentifier) > -1) {
                if (client.allow_automated_notifications) {
                  clientNotifications.on += 1;
                } else {
                  clientNotifications.off += 1;
                }
              } else {
                // this client is from some other describe() test
                // so let us just ignore it
              }
            }); // end foreach

            clientNotifications.on.should.be.exactly(0);
            done(err);
          }).catch(done); // end findOneByAttribute
        }); // end settings post
      }); // end settings get
    }).catch(done); // end findOneByAttribute
  });

  it('should be able to toggle all client notifications on', (done) => {
    Users.findOneByAttribute('email', client.email)
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
      primary.get('/settings').end(function(err, res) {
        const $html = cheerio.load(res.text);
        const csrf = $html('input[name=_csrf]').val();

        primary.post('/settings')
          .send({ _csrf: csrf })
          .send(reqBody)
          .expect(302)
        .end((err, res) => {
          // Now let's query for that same user again
          // but this time make sure that the toggle value
          // reflects the change that was POSTed
          Users.findOneByAttribute('email', client.email)
          .then(user => Clients.findManyByAttribute('cm', user.cmid)).then((clients) => {
            const clientNotifications = { on: 0, off: 0 };
            clients.forEach((client) => {
              if (client.allow_automated_notifications) {
                clientNotifications.on += 1;
              } else {
                clientNotifications.off += 1;
              }
            });

            clientNotifications.off.should.be.exactly(0);
            done(err);
          }).catch(done); // end findOneByAttribute
        }); // end settings post
      }); // end settings get
    }).catch(done); // end findOneByAttribute
  });
});
