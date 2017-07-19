const assert = require('assert');

const Groups = require('../../app/models/groups');

require('colors');
const should = require('should');

describe('Groups checks', () => {
  it('finds groups associated with a given user', (done) => {
    Groups.findByUser(2)
      .then((groups) => {
        groups.length.should.equal(1);
        groups[0].name.should.equal('my cool group');
        done();
      }).catch(done);
  });

  it('finds members in a group', (done) => {
    Groups.findMembers(1)
      .then((members) => {
        members.length.should.equal(2);
        done();
      }).catch(done);
  });

  it('finds a group by id', (done) => {
    Groups.findByID(1)
      .then((group) => {
        group.name.should.equal('my cool group');
        group.members.length.should.equal(2);
        done();
      }).catch(done);
  });
});
