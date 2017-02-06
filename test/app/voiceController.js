const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const resourceRequire = require('../../app/lib/resourceRequire');

const APP = require('../../app/app');

const Notifications = resourceRequire('models', 'Notifications');
const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages');
const Recordings = resourceRequire('models', 'Recordings');
const Messages = resourceRequire('models', 'Messages');
const mock = resourceRequire('lib', 'mock');


const twilioAgent = supertest.agent(APP);

const twilioRecordingRequest = require('../data/twilioVoiceRecording');
const twilioInboundCall = require('../data/twilioInboundCall');
const twilioTranscription = require('../data/twilioTranscription');
const twilioStatusUpdate = require('../data/twilioStatusUpdate');

// #2
const twilioRecordingRequest_2 = require('../data/twilioVoiceRecording_2');
const twilioStatusUpdate_2 = require('../data/twilioStatusUpdate_2');


const RecordingSid = 'REde2dd4be0e7a521f8296a7390a9ab21b';
const emptyTwilioResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

describe('Voice requests with voice controller', () => {
  it.skip('should accept a new voice recording', function (done) {
    this.timeout(6000);
    let params = '?userId=2&clientId=1';
    params += `&deliveryDate=${new Date().getTime()}`;
    twilioAgent.post(`/webhook/voice/save-recording/${params}`)
      .send(twilioRecordingRequest)
      .expect(200)
      .end((err, res) => {
        if (err) { return done(err); }
        return OutboundVoiceMessages.findOneByAttribute(
          'RecordingSid',
          RecordingSid,
        ).then((ovm) => {
          should.exist(ovm);
          done();
        }).catch(done);
      });
  });

  it('should accept a pre-recorded voice notification (OVM)', (done) => {
    // When mock is enabled, libraries send fake responses instead of real ones
    // Example: mailgun library send back fake xml response
    mock.enable();

    let params = '?userId=2&clientId=1';
    params += `&deliveryDate=${new Date().getTime()}`;
    params += '&type=ovm';

    twilioAgent.post(`/webhook/voice/save-recording/${params}`)
      .send(twilioRecordingRequest)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return OutboundVoiceMessages.findOneByAttribute('RecordingSid', RecordingSid)
        .then((ovm) => {
          should.exist(ovm);
          mock.disable();
          done();
        }).catch(done);
      });
  });

  it('when the call is initiated, twilio api should be able to alert clientcomm and receive empty twilio xml response', (done) => {
    const iniatedTwilioCallUpdate = JSON.parse(JSON.stringify(twilioStatusUpdate));
    iniatedTwilioCallUpdate.CallStatus = 'initiated';

    twilioAgent.post('/webhook/voice/status/')
      .send(iniatedTwilioCallUpdate)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        res.text.should.be.exactly(emptyTwilioResponse);

        return OutboundVoiceMessages.findOneByAttribute(
          'call_sid',
          'CAc080f49bc9742c4281b9dbcdb652d29a',
        ).then((ovm) => {
          should.equal(ovm.delivered, false);
          done();
        }).catch(done);
      });
  });

  it('when the phone is ringing, twilio api should be able to alert clientcomm and receive empty twilio xml response', (done) => {
    const iniatedTwilioCallUpdate = JSON.parse(JSON.stringify(twilioStatusUpdate));
    iniatedTwilioCallUpdate.CallStatus = 'ringing';

    twilioAgent.post('/webhook/voice/status/')
      .send(iniatedTwilioCallUpdate)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        res.text.should.be.exactly(emptyTwilioResponse);

        return OutboundVoiceMessages.findOneByAttribute(
          'call_sid',
          'CAc080f49bc9742c4281b9dbcdb652d29a',
        ).then((ovm) => {
          should.equal(ovm.delivered, false);
          done();
        }).catch(done);
      });
  });

  it('should update status of OVM when applicable (e.g. receiving a callback from an OVM outbound)', (done) => {
    twilioAgent.post('/webhook/voice/status/')
      .send(twilioStatusUpdate)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return OutboundVoiceMessages.findOneByAttribute(
          'call_sid',
          'CAc080f49bc9742c4281b9dbcdb652d29a',
        ).then((ovm) => {
          should.equal(ovm.delivered, true);
          should.equal(ovm.last_delivery_attempt, null);

          return Notifications.findOneByAttribute('ovm_id', ovm.id);
        }).then((notification) => {
          should.equal(notification.sent, true);
          done();
        }).catch(done);
      });
  });

  it('should be able to add a transcription to a voice message', (done) => {
    const transcription = twilioTranscription.TranscriptionText;

    twilioAgent.post('/webhook/voice/transcribe/')
      .send(twilioTranscription)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Recordings.findManyByAttribute('RecordingSid', RecordingSid)
        .map((recording) => {
          should.equal(recording.transcription, transcription);

          // Now make sure that a message also exists associated to that recording
          return Messages.where({ recording_id: recording.id });
        }).map((messages) => {
          messages.forEach((message) => {
            should.equal(message.content, transcription);
          });
          return messages;
        }).then((messages) => {
          mock.disable();
          done();
        }).catch(done);
      });
  });

  it('should accept a new recording from a known number', (done) => {
    twilioAgent.post('/webhook/voice')
      .send(twilioInboundCall)
      .expect(200)
      .end((err, resp) => {
        if (err) { return done(err); }
        resp.text.should.match(/\/save-recording\//);
        done();
      });
  });

  it('should accept a new recording from an unknown number', (done) => {
    const poorlyFormattedNumber = '2243678900';
    twilioInboundCall.From = poorlyFormattedNumber;
    twilioAgent.post('/webhook/voice')
      .send(twilioInboundCall)
      .expect(200)
      .end((err, resp) => {
        if (err) {
          return done(err);
        }
        resp.text.should.match(/we were unable to connect you with Criminal Justice Services/);
        done();
      });
  });

  it('should provide twiml for voice recording', (done) => {
    const params = '?userId=HHH&commId=JJJ&deliveryDate=XXX&clientId=888';
    twilioAgent.post(`/webhook/voice/record${params}`)
      .expect(200)
      .end((err, resp) => {
        if (err) { return done(err); }

        resp.text.should.match(/Please leave your message/);
        resp.text.should.match(/HHH/);
        resp.text.should.match(/JJJ/);
        resp.text.should.match(/888/);
        resp.text.should.match(/XXX/);
        done();
      });
  });

  it('should provide twiml to play ovm', (done) => {
    twilioAgent.post('/webhook/voice/play-message?ovmId=1')
      .expect(200)
      .end((err, resp) => {
        if (err) {
          return done(err);
        }

        resp.text.should.match(/have a new message from your case manager/);
        done();
      });
  });

  it('should provide twiml to play ovm', (done) => {
    twilioAgent.post('/webhook/voice/play-message')
      .expect(200)
      .end((err, resp) => {
        if (err) {
          return done(err);
        }

        resp.text.should.match(/t find a recording with that/);
        done();
      });
  });


  // ////////////////////////////////////////////////
  // Processing a second "#2"
  // ////////////////////////////////////////////////


  it('should accept a 2nd pre-recorded voice notification (OVM)', (done) => {
    // When mock is enabled, libraries send fake responses instead of real ones
    // Example: mailgun library send back fake xml response
    mock.enable();

    let params = '?userId=2&clientId=1';
    params += `&deliveryDate=${new Date().getTime()}`;
    params += '&type=ovm';

    twilioAgent.post(`/webhook/voice/save-recording/${params}`)
      .send(twilioRecordingRequest_2)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return OutboundVoiceMessages.findOneByAttribute('RecordingSid', twilioRecordingRequest_2.RecordingSid)
        .then((ovm) => {
          should.exist(ovm);
          mock.disable();
          done();
        }).catch(done);
      });
  });

  it('when the call fails, twilio api should be able to alert clientcomm and receive empty twilio xml response', (done) => {
    const iniatedTwilioCallUpdate = JSON.parse(JSON.stringify(twilioStatusUpdate_2));
    iniatedTwilioCallUpdate.CallStatus = 'failed';

    twilioAgent.post('/webhook/voice/status/')
      .send(iniatedTwilioCallUpdate)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        res.text.should.be.exactly(emptyTwilioResponse);

        return OutboundVoiceMessages.findOneByAttribute(
          'call_sid',
          'CAc123f49ad9742c4281b9dbcdb652d29a', // from voice recording 2
        ).then((ovm) => {
          done();
        }).catch(done);
      });
  });

  it('no recording should have been created yet, because not enough time passed since ovm delivery date', (done) => {
    Recordings.findOneByAttribute('RecordingSid', twilioRecordingRequest_2.RecordingSid)
    .then((recording) => {
      should.equal(recording, null);
      done();
    }).catch(done);
  });

  it('when the call fails after 30 minutes and executes status update processes', (done) => {
    const iniatedTwilioCallUpdate = JSON.parse(JSON.stringify(twilioStatusUpdate_2));
    iniatedTwilioCallUpdate.CallStatus = 'failed';

    OutboundVoiceMessages.findOneByAttribute(
      'call_sid',
      'CAc123f49ad9742c4281b9dbcdb652d29a', // from voice recording 2
    ).then(ovm =>
      // just for the test, let's change the delivery date
      // to a time that is greater than 30 minutes
      // such that "enough time has passed"
       ovm.update({ delivery_date: '2016-11-14 15:00:00' })).then((ovm) => {
      // thene execute a new post update on status
         twilioAgent.post('/webhook/voice/status/')
        .send(iniatedTwilioCallUpdate)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          res.text.should.be.exactly(emptyTwilioResponse);

          return OutboundVoiceMessages.findOneByAttribute(
            'call_sid',
            'CAc123f49ad9742c4281b9dbcdb652d29a', // from voice recording 2
          ).then((ovm) => {
            should.equal(ovm.delivered, true);
            ovm.last_delivery_attempt.should.not.be.exactly(null);
            done();
          }).catch(done);
        });
       }).catch(done);
  });

  it('should have created a new message stream item based on that completed ovm', (done) => {
    Recordings.findOneByAttribute('RecordingSid', twilioRecordingRequest_2.RecordingSid)
    .then((recording) => {
      should.exist(recording);
      done();
    }).catch(done);
  });

  it('should accept a new inbound voice recording (mocked)', (done) => {
    mock.enable();

    let params = '?commId=2';
    params += '&type=message';

    twilioAgent.post(`/webhook/voice/save-recording/${params}`)
      .send(twilioRecordingRequest_2)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        return OutboundVoiceMessages.findOneByAttribute('RecordingSid', twilioRecordingRequest_2.RecordingSid)
        .then((ovm) => {
          should.exist(ovm);
          mock.disable();
          done();
        }).catch(done);
      });
  });
});
