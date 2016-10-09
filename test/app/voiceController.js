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


const RecordingSid = 'REde2dd4be0e7a521f8296a7390a9ab21b'

describe('Voice reqs', function() {

  it.skip('should accept a new voice recording', function(done) {
    this.timeout(6000)
    let params = "?userId=2&clientId=1"
    params += `&deliveryDate=${new Date().getTime()}`
    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err)}
        return OutboundVoiceMessages.findOneByAttribute(
          'RecordingSid', 
          RecordingSid
        ).then((ovm) => {
          should.exist(ovm)
          done()
        }).catch(done)
      });
  });

  it('should accept a new ovm voice recording (mocked)', function(done) {
    mock.enable()
    let params = "?userId=2&clientId=1"
    params += `&deliveryDate=${new Date().getTime()}`
    params += `&type=ovm`
    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err)}
        return OutboundVoiceMessages.findOneByAttribute(
          'RecordingSid', 
          RecordingSid
        ).then((ovm) => {
          should.exist(ovm)
          mock.disable()
          done()
        }).catch(done)
      });
  });

  it('should update status of ovm when applicable', function(done) {
    twilioAgent.post('/webhook/voice/status/')
      .send(twilioStatusUpdate)
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err)}
        return OutboundVoiceMessages.findOneByAttribute(
          'call_sid', 
          'CA3042ffc8b5de3dfcd0d85e57cec02605'
        ).then((ovm) => {
          should.equal(ovm.delivered, true)
          done()
        }).catch(done)
      });
  })

  it('should accept a new inbound voice recording (mocked)', function(done) {
    mock.enable()
    let params = "?commId=2"
    params += `&type=message`
    twilioAgent.post('/webhook/voice/save-recording/' + params)
      .send(twilioRecordingRequest)
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err)}
        return OutboundVoiceMessages.findOneByAttribute(
          'RecordingSid', 
          RecordingSid
        ).then((ovm) => {
          should.exist(ovm)
          mock.disable()
          done()
        }).catch(done)
      });
  });

  it('should be able to add a transcription to a voice message', function(done) {
    let transcription = twilioTranscription.TranscriptionText
    twilioAgent.post('/webhook/voice/transcribe/')
      .send(twilioTranscription)
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err)}
        Recordings.findOneByAttribute('RecordingSid', RecordingSid)
        .then((recording) => {
          should.equal(recording.transcription, transcription)
          return Messages.where({recording_id: recording.id})
        }).map((message) => {
          should.equal(message.content, transcription)
          return message 
        }).then((messages) => {
          mock.disable()
          done()
        }).catch(done)
      });
  })

  it('should accept a new recording from a known number', function(done) {
    twilioAgent.post('/webhook/voice')
      .send(twilioInboundCall)
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)}
        resp.text.should.match(/\/save-recording\//)
        done()
      })
  })

  it('should accept a new recording from an unknown number', function(done) {
    let poorlyFormattedNumber = "2243678900"
    twilioInboundCall.From = poorlyFormattedNumber
    twilioAgent.post('/webhook/voice')
      .send(twilioInboundCall)
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)}
        resp.text.should.match(/We were unable to find your number/)
        done()
      })
  })

  it('should provide twiml for voice recording', function(done) {
    let params = "?userId=HHH&commId=JJJ&deliveryDate=XXX"
    twilioAgent.post('/webhook/voice/record' + params)
      .expect(200)
      .end((err, resp) => {
        if (err) {return done(err)}

        resp.text.should.match(/Please leave your message/)
        resp.text.should.match(/HHH/)
        resp.text.should.match(/JJJ/)
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