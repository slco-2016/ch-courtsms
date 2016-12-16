const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const resourceRequire = require('../../app/lib/resourceRequire')

const APP = require('../../app/app')

const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages')
const Recordings = resourceRequire('models', 'Recordings')
const Messages = resourceRequire('models', 'Messages')
const mock = resourceRequire('lib', 'mock')


const twilioAgent = supertest.agent(APP)

const twilioRecordingRequest = require('../data/twilioVoiceRecording')
const twilioInboundCall = require('../data/twilioInboundCall')
const twilioTranscription = require('../data/twilioTranscription')
const twilioStatusUpdate = require('../data/twilioStatusUpdate')


const RecordingSid = 'REde2dd4be0e7a521f8296a7390a9ab21b';

describe('Voice requests with voice controller', function() {

  it.skip('should accept a new voice recording', function(done) {
    this.timeout(6000);
    let params = '?userId=2&clientId=1';
    params += `&deliveryDate=${new Date().getTime()}`;
    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err)}
        return OutboundVoiceMessages.findOneByAttribute(
          'RecordingSid', 
          RecordingSid
        ).then((ovm) => {
          should.exist(ovm);
          done();
        }).catch(done);
      });
  });

  it('should accept a pre-recorded voice notification (OVM)', function(done) {
    // When mock is enabled, libraries send fake responses instead of real ones
    // Example: mailgun library send back fake xml response
    mock.enable();

    let params = '?userId=2&clientId=1';
        params += `&deliveryDate=${new Date().getTime()}`;
        params += `&type=ovm`;

    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
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

  it('should update status of OVM when applicable (e.g. receiving a callback from an OVM outbound)', function(done) {
    twilioAgent.post('/webhook/voice/status/')
      .send(twilioStatusUpdate)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        return OutboundVoiceMessages.findOneByAttribute(
          'call_sid', 
          'CAc080f49bc9742c4281b9dbcdb652d29a'
        ).then((ovm) => {
          should.equal(ovm.delivered, true);
          done();
        }).catch(done);
      });
  });

  it('should accept a new inbound voice recording (mocked)', function(done) {
    mock.enable();

    let params = '?commId=2';
        params += `&type=message`;

    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
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

  it('should be able to add a transcription to a voice message', function(done) {
    let transcription = twilioTranscription.TranscriptionText;

    twilioAgent.post('/webhook/voice/transcribe/')
      .send(twilioTranscription)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        Recordings.findManyByAttribute('RecordingSid', RecordingSid)
        .map((recording) => {
          should.equal(recording.transcription, transcription);

          // Now make sure that a message also exists associated to that recording
          return Messages.where({recording_id: recording.id, });
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

  it('should accept a new recording from a known number', function(done) {
    twilioAgent.post('/webhook/voice')
      .send(twilioInboundCall)
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)};
        resp.text.should.match(/\/save-recording\//);
        done();
      });
  });

  it('should accept a new recording from an unknown number', function(done) {
    const poorlyFormattedNumber = '2243678900';
    twilioInboundCall.From = poorlyFormattedNumber;
    twilioAgent.post('/webhook/voice')
      .send(twilioInboundCall)
      .expect(200)
      .end((err, resp) => {
        if (err) {
          return done(err);
        } else {
          resp.text.should.match(/we were unable to connect you with Criminal Justice Services/);
          done();
        }
      })
  })

  it('should provide twiml for voice recording', function(done) {
    let params = '?userId=HHH&commId=JJJ&deliveryDate=XXX&clientId=888'
    twilioAgent.post('/webhook/voice/record' + params)
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)}

        resp.text.should.match(/Please leave your message/)
        resp.text.should.match(/HHH/)
        resp.text.should.match(/JJJ/)
        resp.text.should.match(/888/)
        resp.text.should.match(/XXX/)
        done()
      })
  })

  it('should provide twiml to play ovm', function(done) {
    twilioAgent.post('/webhook/voice/play-message?ovmId=1')
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)}

        resp.text.should.match(/have a new message from your case manager/)
        done()
      })
  })

  it('should provide twiml to play ovm', function(done) {
    twilioAgent.post('/webhook/voice/play-message')
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)}

        resp.text.should.match(/t find a recording with that/)
        done()
      })
  })

})