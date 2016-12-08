const assert = require('assert');

require('colors');
const should = require('should');
const resourceRequire = require('../../app/lib/resourceRequire')

const Messages = resourceRequire('models', 'Messages')
const Communications = resourceRequire('models', 'Communications')
const Conversations = resourceRequire('models', 'Conversations')

const mock = resourceRequire('lib', 'mock')

describe('Messages checks', function() {

  // it('Should be able to create client', function(done) {
  //   Messages.findByUserAndClient()
  //   .then((client) => {
  //     client.cm.should.be.exactly(2);
  //     client.first.should.be.exactly('Joe');
  //     done();
  //   }).catch(done);
  // });

  it('should be able to Messages.sendOne email', function(done) {
  	mock.enable()
  	let communication, conversation
  	Communications.findOneByAttribute('type', 'email')
  	.then((resp) => {
  		communication = resp
  		return Conversations.findById(1)
  	}).then((conversation) => {
  		return Messages.sendOne(communication.commid, "hi", conversation)	
  	}).then((messages) => {
  		return Messages.where({content: 'hi', tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>'})
  	}).then((messages) => {
  		should.exist(messages[0])
  		mock.disable()
  		done();
  	}).catch(done)

  }) 
})