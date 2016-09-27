const assert = require('assert');

require('colors');
const should = require('should');

const Messages = require('../../app/models/messages')

describe('Clients checks', function() {

  it('Should be able to create client', function(done) {
    Messages.create(2, 'Joe', 'F', 'Someone', '1988-04-02', 12321, 1234567)
    .then((client) => {
      client.cm.should.be.exactly(2);
      client.first.should.be.exactly('Joe');
      done();
    }).catch(done);
  });
  
})