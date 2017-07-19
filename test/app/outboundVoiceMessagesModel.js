const assert = require('assert');

const OutboundVoiceMessages = require('../../app/models/outboundVoiceMessages');

require('colors');
const should = require('should');

describe('OutboundVoiceMessages checks', () => {
  it('finds ovms that need to be sent', (done) => {
    OutboundVoiceMessages.getNeedToBeSent()
      .then((ovms) => {
        ovms.length.should.equal(1);
        done();
      }).catch(done);
  });
});
