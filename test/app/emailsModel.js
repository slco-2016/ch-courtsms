const assert = require('assert');

const Emails = require('../../app/models/emails')

require('colors');
const should = require('should');
console.log(Emails)
describe('Email checks', function() {

  it('Should be able to create email', function(done) {
    let cleanBody = "this is the content!";
    Emails.create({cleanBody: cleanBody})
    .then((email) => {
      email.cleanBody.should.be.exactly(cleanBody);
      should.exist(email.id)
      done();
    }).catch(done);
  });

})