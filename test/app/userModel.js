/* global describe it */
const assert = require('assert');

const Users = require('../../app/models/users');

require('colors');
const should = require('should');


// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('User checks', () => {
  it('Should be able to get user by Id', (done) => {
    Users.findByID(1).then((user) => {
      user.cmid.should.be.exactly(1);
      user.email.should.be.exactly('owner@test.com');
      should.not.exist(user.password);
      user.should.have.properties({
        cmid: 1,
        org: 1,
        first: 'Test Account',
        last: 'To Remove',
        email: 'owner@test.com',
        position: 'Officer',
        admin: false,
        active: true,
        superuser: false,
        class: 'owner',
      });
      done();
    }).catch(done);
  });

  it('Should be able to query for multiple users at once', (done) => {
    Users.findByIds([1, 2, 3])
    .then((users) => {
      users.length.should.be.exactly(3);
      done();
    }).catch(done);
  });

  it('Should be able to get user by Email', (done) => {
    Users.findByEmail('owner@test.com').then((user) => {
      user.cmid.should.be.exactly(1);
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should be able to get user by clientcomm email', (done) => {
    const email = 'Owner.test@clientcomm.org';
    Users.findByClientCommEmail(email)
    .then((user) => {
      user.cmid.should.be.exactly(1);
      done();
    }).catch(done);
  });

  it('Should return null for user that doesn\'t exist', (done) => {
    Users.findByID(80085).then((user) => {
      should.not.exist(user);
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('finds a user with .findAllByClientIds', (done) => {
    // clients 1 and 2 are both assigned to user 2
    Users.findAllByClientIds([1, 2]).then((users) => {
      users.length.should.be.exactly(1);
      users.map(u => u.cmid).should.containDeep([2]);
      done();
    });
  });
});
