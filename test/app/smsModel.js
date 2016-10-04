const assert = require('assert');

require('colors');
const should = require('should');

const Messages = require('../../app/models/messages');
const Communications = require('../../app/models/communications');
const Conversations = require('../../app/models/conversations');
const sms = require('../../app/lib/sms');

// global reference values
let value = "16198702271";
let toNumber = "12435678910"

describe('Sms model checks', function() {

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
  
})