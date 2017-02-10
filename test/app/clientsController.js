/* global describe it before */
const should = require('should');
const simple = require('simple-mock');
const supertest = require('supertest');

const APP = require('../../app/app');
const Clients = require('../../app/models/clients');
const Messages = require('../../app/models/messages');
const Users = require('../../app/models/users');
const db = require('../../app/db.js');

const primary = supertest.agent(APP);
const supervisor = supertest.agent(APP);

// a client to be created and referenced throughout tests
const uniqueID1 = '123JKL98237iuh23bkj';
const reqBody = {
  first: 'Steven',
  middle: undefined,
  last: 'Nixon',
  dob: '03/12/1990',
  targetUser: 2, // TODO: this must be the user that is logged in
  uniqueID1,
  uniqueID2: '456ABC',
};

const logInAsOwner = (done) => {
  supervisor.post('/login')
    .send({ email: 'owner@test.com' })
    .send({ pass: '123' })
    .expect(302)
    .expect('Location', '/')
    .then(() => {
      done();
    });
};

const logInAsPrimary = (done) => {
  primary.post('/login')
    .send({ email: 'primary@test.com' })
    .send({ pass: '123' })
    .expect(302)
    .expect('Location', '/')
    .then(() => {
      done();
    });
};

const createTestUser = (orgID, department) => {
  // hopefully this won't collide twice on a single test run... callers of this
  // method should still delete the users afterward
  const testUserId = Math.floor(Math.random() * 100000);
  const testUserEmail = `test${testUserId}@example.com`;

  return new Promise((resolve, reject) => {
    Users.createOne('TestUser', '', `Number${testUserId}`, testUserEmail, orgID, department, 'Test', 'Primary')
      .then(() => Users.findByEmail(testUserEmail))
      .then(resolve)
      .catch(reject);
  });
};

describe('Clients supervisor controller view', () => {
  before(logInAsOwner);

  it('should be able to view clients/create as supervisor', (done) => {
    supervisor.get('/org/clients/create')
      .expect(200)
      .end((err, res) => {
        res.text.should.match(RegExp('var users ='));
        res.text.should.match(RegExp('primary@test.com'));
        done(err);
      });
  });

  it('supervisor user should be able to view transfer select page', (done) => {
    Users.findOneByAttribute('email', 'primary@test.com')
    .then(user =>
      // let's see what clients that user has
       Clients.findManyByAttribute('cm', user.cmid)).then((clients) => {
      // we need at least one client for this to work
      // there should be at least one from the seed data
      // still assert with should here to be safe
         clients.length.should.be.greaterThan(0);
         const oneClient = clients[0];
         supervisor.get(`/org/clients/${oneClient.clid}/transfer`)
        .expect(200)
        .end((err, res) => {
          done(err);
        });
       }).catch(done);
  });

  it('supervisor should be able to see all department clients in transfer select', (done) => {
    Users.findOneByAttribute('email', 'primary@test.com')
    .then(user =>
      // let's see what clients that user has
       Clients.findManyByAttribute('cm', user.cmid)).then((clients) => {
      // following same query structure as prior test
         clients.length.should.be.greaterThan(0);
         const oneClient = clients[0];
         supervisor.get(`/org/clients/${oneClient.clid}/transfer?allDepartments=true`)
        .expect(200)
        .end((err, res) => {
          // TODO: We need to think about what we want to check
          //       for to make sure that all departments are showing versus the prior test
          //       otherwise there is no way to discern this test works over the prior
          done(err);
        });
       }).catch(done);
  });

  it('password has should not be visible per issue #311 when the resulting users are logged for typeahead.js', (done) => {
    Users.findOneByAttribute('email', 'primary@test.com')
    .then(user =>
      // let's see what clients that user has
       Clients.findManyByAttribute('cm', user.cmid)).then((clients) => {
      // following same query structure as prior test
         clients.length.should.be.greaterThan(0);
         const oneClient = clients[0];
         supervisor.get(`/org/clients/${oneClient.clid}/transfer?allDepartments=true`)
        .expect(200)
        .end((err, res) => {
          // this is part of the hash we use on all the accounts in the seed
          // it is the result of the password '123' having been entered once prior
          // we want to make sure it is not being injected into the json
          res.text.should.not.match(RegExp('"pass":"$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti"'));
          // the pass key value should simply not be returned, ever
          res.text.should.not.match(RegExp('"pass":'));
          done(err);
        });
       }).catch(done);
  });
});

describe('POST /org/clients/:id/transfer', () => {
  // TODO: is it possible for "primary" users to transfer users as well?
  before(logInAsOwner);

  before((done) => {
    // first delete any stray objects that may have been around from a previous
    // version of this test
    db('cms')
      .whereIn('email', ['test123@example.com', 'test456@example.com'])
      .del();

    db('clients')
      .whereIn('otn', 'otn-1234')
      .del();

    // create two case manager users to transfer between
    createTestUser(1, 1)
      .then((user1) => {
        this.user1 = user1;

        return createTestUser(1, 1);
      })
      .then((user2) => {
        this.user2 = user2;

        // create a client to transfer
        return Clients.create(this.user1.cmid, 'Test', 'E', 'McTestuser', '1998-01-01', 'otn-1234', 'so-123');
      }).then((client) => {
        this.client = client;
        done();
      })
      .catch(err => done(err));
  });

  it('does something', (done) => {
    simple.mock(Messages, 'smartSend')
      .resolveWith('Success!');

    supervisor.post(`/org/clients/${this.client.clid}/transfer`)
      .send({
        user: this.user2.cmid,
        bundleConversations: true,
      })
      .expect(302)
      .end((err) => {
        // assert that the proper message was sent, one that includes the new
        // case manager's name
        const sentMessage = Messages.smartSend.lastCall.args[3];
        const user2Name = `${this.user2.first} ${this.user2.last}`;

        sentMessage.should.match(new RegExp(user2Name));

        simple.restore();
        done(err);
      });
  });
});

describe('Clients primary controller view', () => {
  before(logInAsPrimary);

  it('should be able to view clients/create as case manager', (done) => {
    primary.get('/clients/create')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('should be able to view clients/create', (done) => {
    primary.get('/clients/create')
      .expect(200)
      .end((err, res) => {
        done(err);
      });
  });

  it('should be able to create a new client', (done) => {
    primary.post('/clients/create')
      .send(reqBody)
      .expect(302)
      .end((err, res) => {
        // TODO: The client attribute uniqueID1 is still
        //       referered to as "so" in the database
        Clients.findOneByAttribute('so', uniqueID1)
        .then((client) => {
          should.equal(reqBody.first, client.first);
          should.equal(reqBody.last, client.last);
          done();
        }).catch(done);
      });
  });

  it('should be able to edit the client', (done) => {
    Clients.findOneByAttribute('so', uniqueID1)
    .then((client) => {
      // massage reqBody to match the edit form
      reqBody.autoNotify = false;
      delete reqBody.targetUser;

      primary.post(`/clients/${client.clid}/edit`)
        .send(reqBody)
        .expect(302)
        .end((err, res) => {
          Clients.findOneByAttribute('so', uniqueID1)
          .then((client) => {
            client.allow_automated_notifications.should.be.exactly(false);
            done();
          }).catch(done);
        });
    }).catch(done);
  });
});

// this describe blocks depends on the existence of a client
describe('/org/clients index view', () => {
  it('contains details for a client', (done) => {
    Clients.findOneByAttribute('so', uniqueID1).then((client) => {
      supervisor.get('/org/clients')
        .expect(200)
        .end((err, res) => {
          // assert that it includes the "last name, first name"
          res.text.should.match(RegExp(`${client.last}, ${client.first}`));

          // assert that it includes the case manager
          res.text.should.match(RegExp(`To Remove, Test Account`));
          done(err);
        });
    });
  });
});
