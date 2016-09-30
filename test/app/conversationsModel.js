const assert = require('assert');

const Conversations = require('../../app/models/conversations');
const Clients = require('../../app/models/clients');

require('colors');
const should = require('should');

describe('Conversations checks', function() {

  it('Should be able to create conversation', function(done) {
    Conversations.create(2, 1, "Foobar", true)
    .then((conversation) => {
      conversation.cm.should.be.exactly(2)
      conversation.accepted.should.be.exactly(true)
      done()
    }).catch(done)
  })

  it('Should be able to query by users', function(done) {
    Clients.findAllByUsers(2)
    .then((clients) => {
      // no idea what we should do at this point
      // console.log(clients.length);
      done();
    }).catch(done);
  })

  it('entering clients and commid should return a list of conversations on search', function(done) {
    Clients.findAllByUsers(2)
    .then((clients) => {
      return Conversations.findByClientAndUserInvolvingSpecificCommId(clients, 1)
    }).then((conversations) => {
      done();
    }).catch(done);
  })

  it('user findById should return single result with key columns as obj keys', function(done) {
    Conversations.findById(1)
    .then((conversation) => {
      conversation.hasOwnProperty("client").should.be.exactly(true);
      conversation.hasOwnProperty("cm").should.be.exactly(true);
      conversation.hasOwnProperty("accepted").should.be.exactly(true);
      conversation.hasOwnProperty("open").should.be.exactly(true);
      done()
    }).catch(done);
  })

})