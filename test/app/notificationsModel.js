const assert = require('assert');

require('colors');
const should = require('should');
const resourceRequire = require('../../app/lib/resourceRequire');

const Notifications = resourceRequire('models', 'Notifications');

const mock = resourceRequire('lib', 'mock');

describe('Notifications checks', () => {
  it('finds notifications associated with a given user', (done) => {
    Notifications.findByUser(2)
      .then((notifications) => {
        notifications.length.should.equal(2);
        done();
      }).catch(done);
  });

  it('finds notifications associated with a given client', (done) => {
    Notifications.findByClientID(1)
      .then((notifications) => {
        notifications.length.should.equal(2);
        done();
      }).catch(done);
  });
});
