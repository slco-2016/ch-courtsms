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
      conversations.forEach((conversation) => {
        conversation.cm.should.be.exactly(2);
      });
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
  });

  it('create a new conversation if older than preset time', function(done) {
    let currentDate = new Date();
    Conversations.createNewIfOlderThanSetHours([1], 24)
    .then((conversations) => {
      conversations.forEach((conversation) => {
        let conversationDate = new Date(conversation.updated);
        let difference = conversationDate.getTime() - (currentDate.getTime() - 86400000); // 86400000 is 24 hours
        if (difference < 0) {
          done(Error("For some reason a conversation is older than time it was set for"))
        }
      })
      done();
    }).catch(done);
  });

  it('create new if older than should work even if hours is not set, should default to 24 hrs', function(done) {
    let currentDate = new Date();
    Conversations.createNewIfOlderThanSetHours([1])
    .then((conversations) => {
      conversations.forEach((conversation) => {
        let conversationDate = new Date(conversation.updated);
        let difference = conversationDate.getTime() - (currentDate.getTime() - 86400000); // 86400000 is 24 hours
        if (difference < 0) {
          done(Error("For some reason a conversation is older than time it was set for"))
        }
      })
      done();
    }).catch(done);
  });

  it('should be able to produce unaccepted conversations for each client', function(done) {
    let client1, client2;
    Clients.findById(1)
    .then((resp) => {
      client1 = resp;
      return Clients.findById(2);
    }).then((resp) => {
      client2 = resp;
      return Conversations.createNewNotAcceptedConversationsForAllClients([client1, client2]);
    }).then((conversations) => {
      conversations.forEach((conversation) => {
        [1, 2].indexOf(conversation.client).should.be.greaterThan(-1);
        conversation.accepted.should.be.exactly(false);
      });
      done();
    }).catch(done);
  });

  it('closing by a client should close all convos with that client', function(done) {
    Conversations.closeAllWithClient(1)
    .then(() => {
      return Conversations.findManyByAttribute("client", 1)
    }).then((conversations) => {
      conversations.forEach((conversation) => {
        conversation.open.should.be.exactly(false);
      });
      done();
    }).catch(done);
  });

  it('decide to claim one of the convos that was created, should work', function(done) {
    let currentConvo;
    Conversations.findManyByAttribute("client", 2)
    .then((conversations) => {
      conversations.forEach((conversation) => {
        if (conversation.open) {
          currentConvo = conversation;
        }
      });
      return Conversations.makeClaimDecision( currentConvo.convid,
                                              currentConvo.cm,
                                              currentConvo.client,
                                              true);
    }).then((conversation) => {
      conversation.convid.should.be.exactly(currentConvo.convid);
      done();
    }).catch(done);
  });

})