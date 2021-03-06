const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const cheerio = require('cheerio');

const APP = require('../../app/app');

const Clients = require('../../app/models/clients');
const Users = require('../../app/models/users');

const owner = supertest.agent(APP);
const supervisor = supertest.agent(APP);
const primary = supertest.agent(APP);
const anonymous = supertest.agent(APP);
// request = session(APP)

// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('Basic http req tests', () => {
  it('should no longer redirect from root and instead show splash', (done) => {
    anonymous.get('/')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('should be able to view login page', (done) => {
    anonymous.get('/login')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('should redirect from root', (done) => {
    anonymous.get('/login').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      anonymous.post('/login')
        .send({ _csrf: csrf })
        .send({ email: 'af@sadf' })
        .send({ pass: 'pass' })
        .expect(302)
        .expect('Location', '/login-fail')
        .end((err, res) => {
          done(err);
        }); // end post login
    }); // end get login
  });

  it('owner should login with real creds', (done) => {
    owner.get('/login').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      owner.post('/login')
        .send({ _csrf: csrf })
        .type('form')
        .send({ email: 'owner@test.com' })
        .send({ pass: '123' })
        .expect(302)
        .expect('Location', '/login-success')
        .end((err, res) => {
          done(err);
        }); // end post login
    }); // end get login
  });

  it('primary user should login with real creds', (done) => {
    primary.get('/login').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/login')
        .type('form')
        .send({ _csrf: csrf })
        .send({ email: 'primary@test.com' })
        .send({ pass: '123' })
        .expect(302)
        .expect('Location', '/login-success')
        .end((err, res) => {
          done(err);
        }); // end post login
    }); // end get login
  });

  it('logged in owner user should redirect to org', (done) => {
    owner.get('/')
      .expect(302)
      .expect('Location', '/org')
      .end((err, res) => {
        done(err);
      });
  });

  it('logged in owner should be able to see the department', (done) => {
    owner.get('/org/departments')
      .expect(200)
      .end((err, res) => {
        res.text.should.match(/Pretrial LKJKLJUnique/);
        done(err);
      });
  });

  it('logged in primary should not be able to see client create form', (done) => {
    primary.get('/org/clients/create')
      .expect(302)
      .expect('Location', '/login')
      .end((err, res) => {
        done(err);
      }); // end get create
  });

  it('owner should be able to create user', (done) => {
    owner.get('/org/users/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      owner.post('/org/users/create')
        .send({ _csrf: csrf })
        .send({
          first: 'kuan',
          last: 'butts',
          email: 'kuan@butt.s',
          position: 'captain',
          className: 'name of class',
        })
        .expect(302)
        .end((err, res) => {
          if (err) throw err;
          Users.findByEmail('kuan@butt.s')
          .then((user) => {
            should.exist(user);
            user.first.should.be.exactly('kuan');
            done();
          }).catch(done);
        }); // end post create
    }); // end get create
  });

  it('owner user should have option to load templates on quick message', (done) => {
    owner.get('/org/clients/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      owner.post('/org/clients/create')
        .send({ _csrf: csrf })
        .send({
          targetUser: 2,
          first: 'Jim',
          middle: 'K',
          last: 'Halpert',
          dob: '1990-02-03',
          uniqueID1: 324,
          uniqueID2: 23234,
        })
        .expect(302)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            primary.get('/clients/2/address')
              .expect(200)
              .end((err, res) => {
                res.text.should.match(/Load template/);
                done(err);
              });
          }
        }); // end post create
    }); // end get create
  });

  it('owner should not see captured board on clients view', (done) => {
    owner.get('/clients')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('client without contact methods should reroute to create comm method', (done) => {
    lastNameUnique = 'Orin';
    owner.get('/org/clients/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      owner.post('/org/clients/create')
        .send({ _csrf: csrf })
        .send({
          targetUser: 2,
          first: 'Sandro',
          middle: 'N',
          last: lastNameUnique,
          dob: '1990-02-03',
          uniqueID1: 32334,
          uniqueID2: 2327534,
        })
        .expect(302)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            Clients.findOneByAttribute('last', lastNameUnique)
            .then((client) => {
              if (client) {
                primary.get(`/clients/${client.clid}/communications`)
                  .expect(302)
                  .expect('Location', `/clients/${client.clid}/communications/create`)
                  .end((err, res) => {
                    done(err);
                  });
              } else {
                done(new Error('Could not find client just created'));
              }
            }).catch(done);
          }
        }); // end post create
    }); // end get create
  });

  it('owner user should not have option to load templates on quick message', (done) => {
    owner.get('/org/clients/1/address')
      .expect(200)
      .end((err, res) => {
        res.text.should.not.match(/Load a template/);
        done(err);
      });
  });

  it('owner should be able to close any client', (done) => {
    owner.get('/org/clients/1/alter/close')
    .expect(302)
      .end((err, res) => {
        Clients.findByID(1)
        .then((user) => {
          if (user.active) {
            done(new Error('User was not successfully closed.'));
          } else {
            done(null);
          }
        }).catch(done);
      });
  });

  it('owner should be able to open any client', (done) => {
    owner.get('/org/clients/1/alter/open')
    .expect(302)
      .end((err, res) => {
        Clients.findByID(1)
        .then((user) => {
          if (!user.active) {
            done('User was not successfully closed.');
          } else {
            done(null);
          }
        }).catch(done);
      });
  });

  it('primary can add their own client', (done) => {
    primary.get('/clients/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/clients/create')
        .send({ _csrf: csrf })
        .send({
          first: 'Harroldnewss',
          middle: 'E',
          last: 'Kroner',
          dob: '1927-10-12',
          uniqueID1: 3333,
          uniqueID2: 9238,
        })
      .expect(302)
        .end((err, res) => {
          done(err);
        }); // end post create
    }); // end get create
  });

  it('should be able to add a comm method to a client', (done) => {
    primary.get('/clients/1/communications/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/clients/1/communications/create')
        .send({ _csrf: csrf })
        .send({ description: 'DummyFoo176' })
        .send({ type: 'cell' })
        .send({ value: '18280384828' })
      .expect(302)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            primary.get('/clients/1/communications')
            .expect(200)
              .end((err, res) => {
                res.text.should.match(/Created new communication method/);
                done(err);
              }); // end get communications
          }
        }); // end post create
    }); // end get create
  });

  it('should not be able to add the same communication method two times if first is still active', (done) => {
    owner.get('/clients/1/communications/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf_one = $html('input[name=_csrf]').val();
      owner.post('/clients/1/communications/create')
        .send({ _csrf: csrf_one })
        .send({
          description: 'DummyFoo2',
          type: 'cell',
          value: '4444444444',
        })
      .expect(302)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            owner.get('/clients/1/communications/create')
            .expect(200)
              .end((err, res) => {
                if (err) {
                  done(err);
                } else {
                  const $html = cheerio.load(res.text);
                  const csrf_two = $html('input[name=_csrf]').val();
                  owner.post('/clients/1/communications/create')
                    .send({ _csrf: csrf_two })
                    .send({
                      description: 'DummyFoo2',
                      type: 'cell',
                      value: '4444444444',
                    })
                  .expect(302)
                    .end((err, res) => {
                      if (err) {
                        done(err);
                      } else {
                        owner.get('/clients/1/communications')
                        .expect(200)
                          .end((err, res) => {
                            res.text.should.match(/Client already has that method/);
                            done(err);
                          });
                      }
                    }); // end post create
                }
              }); // end get communications
          }
        }); // end post create
    }); // end get create
  });

  it('primary user should be able to view settings', (done) => {
    primary.get('/settings')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('primary user settings updates should propogate', (done) => {
    primary.get('/settings').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/settings')
        .send({ _csrf: csrf })
        .send({
          first: 'Jim',
          middle: 'L',
          last: 'Primary',
          email: 'uniqueJimPrimary@foobar.org',
          alertFrequency: 48,
          isAway: 'true',
          awayMessage: 'Lorem ipsum dolores ipset.',
        })
        .expect(302)
        .end((err, res) => {
          primary.get('/settings')
            .expect(200)
            .end((err, res) => {
              res.text.should.match(/Lorem ipsum dolores ipset/);
              res.text.should.match(/<input type="radio" value="48" name="alertFrequency" checked>/);
              done(err);
            });
        }); // end post settings
    }); // end get settings
  });

  it('first time user goes to colors for client, should be routed to color manager', (done) => {
    primary.get('/clients/1/edit/color')
      .expect(302)
      .expect('Location', '/colors')
      .end((err, res) => {
        done(err);
      });
  });

  it('color manager view should work', (done) => {
    primary.get('/colors')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('color manager view should not work for not logged in user', (done) => {
    anonymous.get('/colors')
      .expect(302)
      .expect('Location', '/login')
      .end((err, res) => {
        done(err);
      });
  });

  it('creating a new color should have it populate', (done) => {
    primary.get('/colors').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/colors')
        .send({ _csrf: csrf })
        .send({
          color: 'rgb(33,20,200)',
          name: 'Strawberry Red Team',
        })
        .expect(302)
        .expect('Location', '/colors')
        .end((err, res) => {
          primary.get('/colors')
            .expect(200)
            .end((err, res) => {
              res.text.should.match(/Strawberry Red Team/);
              done(err);
            });
        }); // end post colors
    }); // end get colors
  });

  it('primary should not be able to view request new number page', (done) => {
    primary.get('/org/numbers')
      .expect(302)
      .expect('Location', '/login')
      .end((err, res) => {
        done(err);
      });
  });

  it('primary should not be able to view request new number page', (done) => {
    primary.get('/org/numbers/create')
      .expect(302)
      .expect('Location', '/login')
      .end((err, res) => {
        done(err);
      });
  });

  it('owner should be able to view request new number page', (done) => {
    owner.get('/org/numbers')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('owner should be able to view request new number page', (done) => {
    owner.get('/org/numbers/create')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('primary can initiate create new voice message', (done) => {
    Clients.findManyByAttribute('cm', 2)
    .then((clients) => {
      // assume here that there is at least one client from seeds
      const client = clients[0];

      primary.get(`/clients/${client.clid}/voicemessage`)
        .expect(200)
        .end((err, res) => {
          done(err);
        });
    }).catch(done);
  });

  it('departments page should have options to send notifications', (done) => {
    owner.get('/org/departments')
      .expect(200)
      .end((err, res) => {
        res.text.should.match(/\/org\/alerts\/create\?department=/);
        done(err);
      });
  });

  it('owner should be able to go to create an alert, should clearly indicate department wide', (done) => {
    owner.get('/org/alerts/create?department=1')
      .expect(200)
      .end((err, res) => {
        res.text.should.match(/Department\-wide/);
        done(err);
      });
  });

  it('alert subject length must be greater than 0', (done) => {
    owner.get('/org/alerts/create').end((err, res) => {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      owner.post('/org/alerts/create?department=1')
        .send({ _csrf: csrf })
        .send({
          orgId: '',
          departmentId: '1',
          targetUserId: '',
          subject: '',
          message: '',
        })
        .redirects(1)
        .end((err, res) => {
          res.redirect.should.be.exactly(false);
          // TODO: @maxmcd this error should flash but i am having trouble getting
          // it to render on text, although it does consistently in app
          // res.text.should.match(/subject needs to be at least 1 character long/);
          done(err);
        }); // end post create
    }); // end get create
  });

  it('submitting a bad number for voice message should error correctly', (done) => {
    Clients.findManyByAttribute('cm', 2)
    .then((clients) => {
      // assume here that there is at least one client from seeds
      const client = clients[0];

      primary.get(`/clients/${client.clid}/voicemessage`).end((err, res) => {
        const $html = cheerio.load(res.text);
        const csrf = $html('input[name=_csrf]').val();
        primary.post(`/clients/${client.clid}/voicemessage`)
          .send({ _csrf: csrf })
          .send({
            commId: '1',
            sendDate: '2016-10-20',
            sendHour: 10,
            value: '123',
          })
          .expect(302)
          .expect('Location', `/clients/${client.clid}/voicemessage`)
          .end((errb, resb) => {
            done(errb);
          }); // end post voicemessage
      }); // end get voicemessage
    }).catch(done);
  });
});
