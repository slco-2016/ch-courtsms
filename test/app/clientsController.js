const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Clients = require('../../app/models/clients');
const Users = require('../../app/models/users');

const primary = supertest.agent(APP);
const supervisor = supertest.agent(APP);

// a client to be created and referenced throughout tests
const uniqueID1 = '123JKL98237iuh23bkj';
let reqBody = {
  first: 'Steven',
  middle: undefined,
  last: 'Nixon',
  dob: '03/12/1990',
  uniqueID1: uniqueID1,
  uniqueID2: '456ABC',
};

describe('Clients supervisor controller view', function() {
  before(function(done) {
    supervisor.post('/login')
      .send({email:'owner@test.com', })
      .send({pass:'123', })
      .expect(302)
      .expect('Location', '/')
      .then(() => {
        done();
      });
  });

  it('should be able to view clients/create as supervisor', function(done) {
    supervisor.get('/org/clients/create')
      .expect(200)
      .end(function(err, res) {
        res.text.should.match(RegExp('var users ='));
        res.text.should.match(RegExp('primary@test.com'));
        done(err);
      });
  });

  it('supervisor user should be able to view transfer select page', function (done) {
    Users.findOneByAttribute('email', 'primary@test.com')
    .then((user) => {
      // let's see what clients that user has
      return Clients.findManyByAttribute('cm', user.cmid);
    }).then((clients) => {
      // we need at least one client for this to work
      // there should be at least one from the seed data
      // still assert with should here to be safe
      clients.length.should.be.greaterThan(0);
      const oneClient = clients[0];
      supervisor.get(`/org/clients/${oneClient.clid}/transfer`)
        .expect(200)
        .end(function(err, res) {
          done(err);
        });
    }).catch(done);
  });

  it('supervisor should be able to see all department clients in transfer select', function (done) {
    Users.findOneByAttribute('email', 'primary@test.com')
    .then((user) => {
      // let's see what clients that user has
      return Clients.findManyByAttribute('cm', user.cmid);
    }).then((clients) => {
      // following same query structure as prior test
      clients.length.should.be.greaterThan(0);
      const oneClient = clients[0];
      supervisor.get(`/org/clients/${oneClient.clid}/transfer?allDepartments=true`)
        .expect(200)
        .end(function(err, res) {
          // TODO: We need to think about what we want to check 
          //       for to make sure that all departments are showing versus the prior test
          //       otherwise there is no way to discern this test works over the prior
          done(err);
        });
    }).catch(done);
  });

  it('password has should not be visible per issue #311 when the resulting users are logged for typeahead.js', function (done) {
    Users.findOneByAttribute('email', 'primary@test.com')
    .then((user) => {
      // let's see what clients that user has
      return Clients.findManyByAttribute('cm', user.cmid);
    }).then((clients) => {
      // following same query structure as prior test
      clients.length.should.be.greaterThan(0);
      const oneClient = clients[0];
      supervisor.get(`/org/clients/${oneClient.clid}/transfer?allDepartments=true`)
        .expect(200)
        .end(function(err, res) {
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

describe('Clients primary controller view', function() {

  before(function(done) {
    primary.post('/login')
      .send({email:'primary@test.com', })
      .send({pass:'123', })
      .expect(302)
      .expect('Location', '/')
      .then(() => {
        done();
      });
  });

  it('should be able to view clients/create as case manager', function(done) {
    primary.get('/clients/create')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

  it('should be able to view clients/create', function(done) {
    primary.get('/clients/create')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

  it('should be able to create a new client', function(done) {
    primary.post('/clients/create')
      .send(reqBody)
      .expect(302)
      .end(function(err, res) {
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

  it('should be able to edit the client', function(done) {
    reqBody.autoNotify = false;
    Clients.findOneByAttribute('so', uniqueID1)
    .then((client) => {
      primary.post(`/clients/${client.clid}/edit`)
        .send(reqBody)
        .expect(302)
        .end(function(err, res) {
          Clients.findOneByAttribute('so', uniqueID1)
          .then((client) => {
            client.allow_automated_notifications.should.be.exactly(false);
            done();
          }).catch(done);
        });
    }).catch(done);
  });

});