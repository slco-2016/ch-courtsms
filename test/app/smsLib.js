const assert = require('assert');

require('colors');
const should = require('should');

const Communications = require('../../app/models/communications');

const sms = require('../../app/lib/sms');

const supertest = require('supertest');
const APP = require('../../app/app');
const twilioAgent = supertest.agent(APP);
const smsData = require('../data/testSMSData');

// global reference values
let value = "16198702271";
let toNumber = "12435678910"

describe('Sms library checks', function() {

  it('create or find from value', function(done) {
    Communications.getOrCreateFromValue(value, "cell")
    .then((communication) => {
      communication.value.should.be.exactly(value);
      done();
    }).catch(done);
  });

  it('if same value supplied twice still same comm device', function(done) {
    Communications.getOrCreateFromValue(value, "cell")
    .then((communication1) => {

      Communications.getOrCreateFromValue(value, "cell")
      .then((communication2) => {
        communication1.value.should.be.exactly(communication2.value);
        communication1.commid.should.be.exactly(communication2.commid);
        communication1.description.should.be.exactly(communication2.description);
        done();
      }).catch(done);

    }).catch(done);
  });

  it('sms library should retrieve clients with a number and comm device', function(done) {
    Communications.getOrCreateFromValue(value, "cell")
    .then((communication) => {

      sms.retrieveClients(toNumber, communication)
      .then((clients) => {
        done();
      }).catch(done);

    }).catch(done);
  });

  it('sms library be able to query for all uncheck twilio messages', function(done) {

    let newSmsBody = smsData;
    newSmsBody.From = "10008384828"
    twilioAgent.post('/webhook/sms')
      .send(newSmsBody)
      .expect(200)
      .end(function(err, res) {

        sms.statusCheck()
        .then((messages) => {
          // we should have at least one message in there from the seed data base
          messages.length.should.be.greaterThan(0);
          done();
        }).catch(done);

      })

  });
  
})