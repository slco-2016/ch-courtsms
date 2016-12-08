const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Communications = require('../../app/models/communications');
const CommConns = require('../../app/models/commConns');

const primary = supertest.agent(APP);
const twilioRecordingRequest = require('../data/twilioVoiceRecording.js');

const uniquePhoneNumber = '12342342345';
const uniquePhoneNumberName = 'unique phone number 1';

describe('Voice requirements', function() {

  before(function(done) {
    primary.post('/login')
      .send({email:'primary@test.com', })
      .send({pass:'123', })
      .expect(302)
      .expect('Location', '/')
      .then(() => {

        // should be able to create a phone number cell type communication
        primary.post('/clients/2/communications/create')
          .send({
            description: uniquePhoneNumberName,
            type: 'cell',
            value: uniquePhoneNumber,
          })
          .expect(302)
          .then(() => {
            Communications.findOneByAttribute('value', uniquePhoneNumber)
            .then((communication) => {
              should.equal(communication.type, 'cell');
              should.equal(communication.description, uniquePhoneNumberName);
              done();

            }).catch(done);
          });
      });
  });

  it('should be able to create email type communication', function(done) {
    primary.post('/clients/2/communications/create')
      .send({
        description: 'email comm',
        type: 'email',
        value: 'test@test.com',
      })
      .expect(302)
      .end(function(err, res) {
        Communications.findOneByAttribute('value', 'test@test.com')
        .then((communication) => {
          should.equal(communication.type, 'email');
          should.equal(communication.description, 'email comm');
          done();
        }).catch(done);
      });
  });

  it('should be able to create a phone number cell type communication', function (done) {
    primary.post('/clients/2/communications/create')
      .send({
        description: 'random number',
        type: 'cell',
        value: '18288384838',
      })
      .expect(302)
      .end(function(err, res) {
        Communications.findOneByAttribute('value', '18288384838')
        .then((communication) => {
          should.equal(communication.type, 'cell');
          should.equal(communication.description, 'random number');
          done();
        }).catch(done);
      });
  });

  it('modifying an existing current phone number', function (done) {
    const newNameForContact = 'unique phone number 1 modified';
    primary.post('/clients/2/communications/create')
      .send({
        description: newNameForContact,
        type: 'cell',
        value: uniquePhoneNumber,
      })
      .expect(302)
      .end(function(err, res) {
        Communications.findOneByAttribute('value', uniquePhoneNumber)
        .then((communication) => {
          should.equal(communication.type, 'cell');
          should.equal(communication.description, uniquePhoneNumberName);

          return CommConns.findManyByAttribute('comm', communication.commid);
        }).then((commconns) => {
          // it should have replaced and updated previous commconn
          should.equal(commconns.length, 1);
          should.equal(commconns[0].name, newNameForContact);
          done();
        }).catch(done);
      });
  });

});