const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Clients = require('../../app/models/clients');

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