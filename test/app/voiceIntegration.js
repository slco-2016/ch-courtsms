const supertest = require('supertest');
const moment = require('moment');

const Users = require('../../app/models/users');
const voice = require('../../app/lib/voice');
const twilioRecordingRequest = require('../data/twilioVoiceRecording.js');
const OutboundVoiceMessages = require('../../app/models/outboundVoiceMessages');
const Communications = require('../../app/models/communications');

const ngrokTestServer = require('../ngrokTestServer');

let ngrokUrl;

describe.skip('Voice lib checks', () => {
  before(function (done) {
    this.timeout(100000);
    const app = require('../../app/app');
    const server = app.listen(4000, () => {
      ngrokTestServer(4000, (url) => {
        ngrokUrl = url;
        done();
      });
    });
  });

  it('Should be able to call me to leave a message', function (done) {
    this.timeout(100000);
    const deliveryDate = new Date();
    const userQuery = Users.findById(2);
    userQuery.then(user => Communications.findById(1)).then(communication => voice.recordVoiceMessage(
        userQuery.value(),
        communication.commid,
        deliveryDate,
        '+12033133609',
        ngrokUrl
      )).then((call) => {
        const i = setInterval(() => {
          OutboundVoiceMessages.getNeedToBeSent()
        .then((ovms) => {
          ovms.forEach((ovm) => {
            if (ovm.delivery_date > moment().subtract(1, 'minute')) {
              clearInterval(i);
              done();
            }
          });
        });
        }, 1000);
      }).catch(done);
  });

  // TODO: it should send messages that need to be sent
});
