const assert = require('assert');

const Users = require('../../app/models/users')

require('colors');
const should = require('should');


// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

describe('User checks', function() {

  it('Should be able to get user by Id', function(done) {
    Users.findByID(1).then((user) => {
      user.cmid.should.be.exactly(1)
      user.email.should.be.exactly("owner@test.com")
      should.not.exist(user.password)
      user.should.have.properties({
        cmid: 1,
        org: 1,
        first: "Test Account",
        last: "To Remove",
        email: "owner@test.com",
        position: "Officer",
        admin: false,
        active: true,
        superuser: false,
        class: "owner",
      })
      done();
    })
  })

  it('Should be able to get user by Email', function(done) {
    Users.findByEmail("owner@test.com").then((user) => {
      user.cmid.should.be.exactly(1)
      done();
    }).catch((err) => {
      done(err);
    })
  })

  it('Should return null for user that doesn\'t exist', function(done) {
    Users.findByID(80085).then((user) => {
      should.not.exist(user)
      done();
    }).catch((err) => {
      done(err);
    })
  })

})