const assert = require('assert');

require('colors');
const should = require('should');
const simple = require('simple-mock');

const twClient = require('../../app/lib/twClient');
const mailgun = require('../../app/lib/mailgun');

const resourceRequire = require('../../app/lib/resourceRequire');
const Messages = resourceRequire('models', 'Messages');
const Communications = resourceRequire('models', 'Communications');
const Conversations = resourceRequire('models', 'Conversations');

describe('Messages model', () => {
  // the sid is set in seeds.js
  it('sends an email', done => {
    simple.mock(mailgun, 'sendEmail').resolveWith({
      id: '<2013FAKE82626.18666.16540@clientcomm.org>',
      message: 'queued',
    });

    Promise.all([
      Communications.findOneByAttribute('type', 'email'),
      Conversations.findById(1),
    ])
      .then(([communication, conversation]) => {
        return Messages.sendOne(communication.commid, 'hi', conversation);
      })
      .then(messages => {
        return Messages.where({
          content: 'hi',
          tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>',
        });
      })
      .then(messages => {
        should.exist(messages[0]);
        simple.restore();
        done();
      })
      .catch(done);
  });

  it('sends an sms message', done => {
    simple
      .mock(twClient, 'sendMessage')
      .callbackWith(null, { sid: 123, status: 'Success!' });

    Promise.all([
      Communications.findById(3),
      Conversations.findById(3),
    ]).then(([comm, conversation]) => {
      const body = 'This is a test message.';

      Messages.sendOne(comm.commid, body, conversation)
        .then(messages => {
          should(twClient.sendMessage.calls.length).be.exactly(1);
          should(twClient.sendMessage.lastCall.arg.body).equal(body);
          should(twClient.sendMessage.lastCall.arg.to).equal(comm.value);

          simple.restore();
          done();
        })
        .catch(err => done(err));
    });
  });

  it('sends a multi-line sms message', done => {
    simple
      .mock(twClient, 'sendMessage')
      .callbackWith(null, { sid: 123, status: 'Success!' });

    Promise.all([
      Communications.findById(3),
      Conversations.findById(3),
    ]).then(([comm, conversation]) => {
      const body = 'This is a test message.\n\nWith more than one line.';

      Messages.sendOne(comm.commid, body, conversation)
        .then(messages => {
          should(twClient.sendMessage.calls.length).be.exactly(1);
          should(twClient.sendMessage.lastCall.arg.body).equal(body);
          should(twClient.sendMessage.lastCall.arg.to).equal(comm.value);

          simple.restore();
          done();
        })
        .catch(err => done(err));
    });
  });

  it('sends an sms message longer than 160 characters', done => {
    simple
      .mock(twClient, 'sendMessage')
      .callbackWith(null, { sid: 123, status: 'Success!' });

    Promise.all([
      Communications.findById(3),
      Conversations.findById(3),
    ]).then(([comm, conversation]) => {
      const body = 'This is a lengthy, extended, prolonged, extensive, protracted, long-lasting, long-drawn-out, drawn-out, spun out, dragged out, seemingly endless, lingering, interminable test message, not a concise, brief, succinct, compact, summary, economical, crisp, pithy, epigrammatic, laconic, thumbnail, capsule, abridged, abbreviated, condensed one.';

      Messages.sendOne(comm.commid, body, conversation)
        .then(messages => {
          should(twClient.sendMessage.calls.length).be.exactly(1);
          should(twClient.sendMessage.lastCall.arg.body).equal(body);
          should(twClient.sendMessage.lastCall.arg.to).equal(comm.value);

          simple.restore();
          done();
        })
        .catch(err => done(err));
    });
  });

});
