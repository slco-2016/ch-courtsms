const assert = require('assert');

require('colors');
const should = require('should');
const resourceRequire = require('../../app/lib/resourceRequire');

const Notifications = resourceRequire('models', 'Notifications');

const mock = resourceRequire('lib', 'mock');

describe('Notifications checks', () => {

  // We moved this to scheduled operations tests
  // becuase this should be a lib, not a model method
  // it('checkAndSendNotifications should not error', function(done) {
  // 	Notifications.checkAndSendNotifications()
  // 	.then((resp) => {
  //     done();
  // 	}).catch(done);

  // });
});
