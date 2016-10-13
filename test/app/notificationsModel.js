const assert = require('assert');

require('colors');
const should = require('should');
const resourceRequire = require('../../app/lib/resourceRequire');

const Notifications = resourceRequire('models', 'Notifications');

const mock = resourceRequire('lib', 'mock');

describe('Notifications checks', function() {

  it('checkAndSendNotifications should not error', function(done) {
  	Notifications.checkAndSendNotifications()
  	.then((resp) => {
      done();
  	}).catch(done);

  }); 
});