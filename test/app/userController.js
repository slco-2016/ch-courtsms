const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app')
const Users = require('../../models/models').Users;
const owner = supertest.agent(APP)
const supervisor = supertest.agent(APP)
const primary = supertest.agent(APP)
const anonymous = supertest.agent(APP)
// request = session(APP)

// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('Basic http req tests', function() {

  it('should redirect from root', function(done) {
    anonymous.get('/')
      .expect(302)
      .expect('Location', '/login')
      .end(function(err, res) {
        done(err);
      });
  });

  it('should be able to view login page', function(done) {
    anonymous.get('/login')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  });

  it('should redirect from root', function(done) {
    anonymous.post('/login')
      .field('email', 'af@sadf')
      .field('pass', 'pass')
      .expect(302)
      .expect('Location', '/login-fail')
      .end(function(err, res) {
        done(err);
      });
  });

  it('owner should login with real creds', function(done) {
    owner.post('/login')
      .type('form')
      .send({'email':'owner@test.com'})
      .send({'pass':'123'})
      .expect(302)
      .expect('Location', '/')
      .end(function(err, res) {
        done(err);
      });
  });

  it('primary user should login with real creds', function(done) {
    primary.post('/login')
      .type('form')
      .send({'email':'primary@test.com'})
      .send({'pass':'123'})
      .expect(302)
      .expect('Location', '/')
      .end(function(err, res) {
        done(err);
      });
  });  

  it('logged in owner user should redirect to org', function(done) {
    owner.get('/')
      .expect(302)
      .expect('Location', '/org')
      .end(function(err, res) {
        done(err);
      });
  });

  it ('logged in owner should be able to see the department', function(done) {
    owner.get('/org/departments')
      .expect(200)
      .end(function(err, res) {
        res.text.should.match(/Pretrial LKJKLJUnique/)
        done(err);
      });
  });

  it ('logged in primary shoud not be able to create client', function(done) {
    primary.post('/org/clients/create')
      .expect(302)
      .expect('Location', '/login')
      .end(function(err, res) {
        done(err);
      })
  });

  it('owner should be able to create client', function(done) {
    owner.post('/org/users/create')
      .send({
        first: 'kuan',
        last: 'butts',
        email: 'kuan@butt.s',
        position: 'captain',
        className: 'name of class',
      })
      .expect(302)
      .end(function(err, res) {
        if (err) throw err;
        Users.findByEmail('kuan@butt.s')
        .then((user) => {
          should.exist(user);
          user.first.should.be.exactly('kuan');
          done();
        }).catch(done);
      });
  });

  it('primary user should have option to load templates on quick message', function(done) {
    primary.get('/clients/1/address')
      .expect(200)
      .end(function(err, res) {
        res.text.should.match(/Load a template/)
        done(err);
      });
  });

  it('primary user should reroute to create if no comm methods for client', function(done) {
    primary.get('/clients/1/communications')
      .expect(302)
      .end(function(err, res) {
        done(err);
      });
  });

  it('owner user should not have option to load templates on quick message', function(done) {
    owner.get('/org/clients/1/address')
      .expect(200)
      .end(function(err, res) {
        res.text.should.not.match(/Load a template/)
        done(err);
      });
  });

  it('owner should be able to close any client', function(done) {
    owner.get('/org/clients/1/alter/close')
    .expect(302)
      .end(function(err, res) {
        // TODO: can we check the state of the client here
        // Use the Users model from line 100
        console.log(res.text);
        done(err);
      });
  });

  // Write a test for clients list page features first
  // Then write features after
  // it () 

})