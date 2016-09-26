const assert = require('assert');

const Communications = require('../../app/models/communications')

require('colors');
const should = require('should');


let phoneId;
let phone = '12345678906';
describe('Communications checks', function() {

  it('Should be able to create communication', function(done) {
    Communications.createOne('cell', 'none', '12345678900')
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

  })
})