const assert = require('assert');

const Communications = require('../../app/models/communications')
const Conversations = require('../../app/models/conversations');

require('colors');
const should = require('should');


let phoneId;
let phone = '12345678906';
let toNumber = "12435678910"
describe('Communications checks', function() {

  it('Should be able to create communication', function(done) {
    Communications.create('cell', 'none', '12345678900')
    .then((communication) => {
      communication.type.should.be.exactly('cell')
      communication.value.should.be.exactly('12345678900')
      done()
    }).catch(done)
  })

  it('Should be able to create communication from value', function(done) {
    Communications.getOrCreateFromValue(phone, "cell")
    .then((communication) => {
      communication.type.should.be.exactly('cell')
      communication.value.should.be.exactly(phone)
      phoneId = communication.commid
      done()
    }).catch(done)
  })

  it('Should be able to get getOrCreate existing comm', function(done) {
    Communications.getOrCreateFromValue(phone, "cell")
    .then((communication) => {
      communication.commid.should.be.exactly(phoneId)
      done()
    }).catch(done)
  });

  it('create or find from value', function(done) {
    Communications.getOrCreateFromValue(phone, "cell")
    .then((communication) => {
      communication.value.should.be.exactly(phone);
      done();
    }).catch(done);
  });

  it('if same value supplied twice still same comm device', function(done) {
    Communications.getOrCreateFromValue(phone, "cell")
    .then((communication1) => {

      Communications.getOrCreateFromValue(phone, "cell")
      .then((communication2) => {
        communication1.value.should.be.exactly(communication2.value);
        communication1.commid.should.be.exactly(communication2.commid);
        communication1.description.should.be.exactly(communication2.description);
        done();
      }).catch(done);

    }).catch(done);
  });

})