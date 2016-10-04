const assert = require('assert');

const Departments = require('../../app/models/departments');

require('colors');
const should = require('should');


let phoneId;
let phone = '12435678910';
describe('Departments checks', function() {

  it('should be able to find departments associated with a given number', function(done) {
      Departments.findByPhoneNumber(phone)
      .then((departments) => {
        // Seeds include at least one department with that number
        departments.length.should.be.greaterThan(0);
        done()
    }).catch(done)
  })
})