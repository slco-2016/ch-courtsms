const assert = require('assert');

const Conversations = require('../../app/models/conversations');
const Clients = require('../../app/models/clients');

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

  it('Should be able to create communication', function(done) {
    Clients.findAllByUsers(2)
    .then((clients) => {
      return Conversations.findOrCreate(clients)
    }).then((conversations) => {
      conversations.forEach((conversation) => {
        conversation.cm.should.be.exactly(2);
      });
      done();
    }).catch(done)
  })
  
})