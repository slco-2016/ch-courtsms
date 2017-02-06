const supertest = require('supertest');
const moment = require('moment');

const Recordings = require('../../app/models/recordings');
const Messages = require('../../app/models/messages');
const Users = require('../../app/models/users');

const voice = require('../../app/lib/voice');
const twilioRecordingRequest = require('../data/twilioVoiceRecording.js');
const OutboundVoiceMessages = require('../../app/models/outboundVoiceMessages');

const ngrokTestServer = require('../ngrokTestServer');

let ngrokUrl;

describe.skip('Voice lib checks', () => {
  before((done) => {
    const app = require('../../app/app');
    const server = app.listen(4000, () => {
      ngrokTestServer(4000, (url) => {
        ngrokUrl = url;
        done();
      });
    });
  });

  it('Should be able to call me to leave a message', function (done) {
    this.timeout(1000);
    const deliveryDate = new Date();
    const userQuery = Users.findById(2);
    userQuery.then(user => user.getClients()).then(clients => voice.recordVoiceMessage(
        ngrokUrl,
        userQuery.value(),
        clients[0],
        deliveryDate,
        '+18588694735',
      )).then((call) => {
        const interval = setInterval(() => {
          OutboundVoiceMessages.getNeedToBeSent()
        .then((ovms) => {
          ovms.forEach((ovm) => {
            if (ovm.delivery_date > moment().subtract(1, 'minute')) {
              clearInterval(interval);
              done();
            }
          });
        });
        }, 1000);
      }).catch(done);
  });

  it('Should send messages that need to be sent', function (done) {
    this.timeout(100000);
    voice.sendPendingOutboundVoiceMessages(ngrokUrl)
    .then((obvs) => {
      const i = setInterval(() => {
        OutboundVoiceMessages.findOneByAttribute('delivered', true)
        .then((ovm) => {
          if (ovm) {
            done();
            clearInterval(i);
          }
        });
      }, 1000);
    });
  });

  it('Sent messages should be added to message stream', (done) => {
    // TODO Make sure this code actually works...
    // Find a message that is in OVM that has been delivered
    // Get that ovm id
    // Find a message in messages that has that ovm id

    // globals
    let ovm,
      recording;

    OutboundVoiceMessages.findOneByAttribute('delivered', true)
    .then((resp) => {
      ovm = resp;
      ovm.should.not.be(null);

      return Recordings.findOneByAttribute('recording_key', ovm.recording_key);
    }).then((resp) => {
      recording = resp;
      recording.should.not.be(null);

      return Notifications.findOneByAttribute('ovm_id', ovm.id);
    }).then((notification) => {
      notification.should.not.be(null);
      const clientId = notification.client;
      const userId = notification.cm;

      return Conversations.findByUserAndClient(userId, clientId);
    }).then((conversations) => {
      conversations.length.shoud.be.greaterThan(0);
      const conversationIds = conversations.map(ea => ea.convid);

      return Messages.findWithSentimentAnalysisAndCommConnMetaByConversationIds(conversationIds);
    }).then((messages) => {
      const messagesWithRelevantRecording = messages.filter(ea => ea.recording.recording_key == ovm.recording_key);
      messagesWithRelevantRecording.length.should.be.greaterThan(0);

      done();
    }).catch(done);
  });
});
