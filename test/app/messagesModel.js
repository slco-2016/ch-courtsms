const assert = require('assert');

require('colors');
const should = require('should');
const simple = require('simple-mock');

const twClient = require('../../app/lib/twClient');

const resourceRequire = require('../../app/lib/resourceRequire');
const Messages = resourceRequire('models', 'Messages');
const Communications = resourceRequire('models', 'Communications');
const Conversations = resourceRequire('models', 'Conversations');

const mock = resourceRequire('lib', 'mock');

describe('Messages model', () => {
  // it('Should be able to create client', function(done) {
  //   Messages.findByUserAndClient()
  //   .then((client) => {
  //     client.cm.should.be.exactly(2);
  //     client.first.should.be.exactly('Joe');
  //     done();
  //   }).catch(done);
  // });

  it('sends a Messages.sendOne email', done => {
    mock.enable();
    let communication, conversation;
    Communications.findOneByAttribute('type', 'email')
      .then(resp => {
        communication = resp;
        return Conversations.findById(1);
      })
      .then(conversation =>
        Messages.sendOne(communication.commid, 'hi', conversation)
      )
      .then(messages =>
        Messages.where({
          content: 'hi',
          tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>',
        })
      )
      .then(messages => {
        should.exist(messages[0]);
        mock.disable();
        done();
      })
      .catch(done);
  });

  it('sends a sms message', done => {
    simple.mock(twClient, 'sendMessage')
      .callbackWith(null, { sid: 123, status: 'Success!' });

    Promise.all([
      Communications.findById(3),
      Conversations.findById(3),
    ]).then(([comm, conversation]) => {
      const body = 'This is a test message.';

      Messages.sendOne(comm.commid, body, conversation)
        .then(messages => {
          twClient.sendMessage.calls.length.should.be.exactly(1);
          twClient.sendMessage.lastCall.arg.body.should.equal(body);
          twClient.sendMessage.lastCall.arg.to.should.equal(comm.value);

          simple.restore();
          done();
        })
        .catch(err => done(err));
    });
  });

  it('sends a multi-line sms message', done => {
    simple.mock(twClient, 'sendMessage')
      .callbackWith(null, { sid: 123, status: 'Success!' });

    Promise.all([
      Communications.findById(3),
      Conversations.findById(3),
    ]).then(([comm, conversation]) => {
      const body = 'This is a test message.\n\nWith more than one line.';

      Messages.sendOne(comm.commid, body, conversation)
        .then(messages => {
          twClient.sendMessage.calls.length.should.be.exactly(1);
          twClient.sendMessage.lastCall.arg.body.should.equal(body);
          twClient.sendMessage.lastCall.arg.to.should.equal(comm.value);

          simple.restore();
          done();
        })
        .catch(err => done(err));
    });
  });


});
