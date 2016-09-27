const assert = require('assert');

const Conversations = require('../../app/models/conversations');

require('colors');
const should = require('should');

describe('Conversations checks', function() {

  it('Should be able to create communication', function(done) {
    Conversations.create(2, 1, "Foobar", true)
    .then((communication) => {
      communication.cm.should.be.exactly(2)
      communication.accepted.should.be.exactly(true)
      done()
    }).catch(done)
  })
  
})