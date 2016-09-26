const assert = require('assert');

const Conversations = require('../../app/models/conversations');

require('colors');
const should = require('should');

describe('Conversations checks', function() {

  it('Should be able to create communication', function(done) {
    Conversations.createOne('cell', 'none', '12345678900')
    .then((communication) => {
      communication.type.should.be.exactly('cell')
      communication.value.should.be.exactly('12345678900')
      done()
    }).catch(done)
  })
  
})