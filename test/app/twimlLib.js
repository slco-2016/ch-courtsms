const twiml = require('../../app/lib/twiml')
const should = require('should');

describe('TwiML generator checks', function() {
  it('should generate an empty response', function(done) {
    let out = twiml.xmlResponse(twiml.response())
    should.equal(
      out, 
      "<?xml version='1.0' encoding='UTF-8'?><Response></Response>"
    )
    done();
  })
  it('should be able to say something', function(done) {
    let out = twiml.xmlResponse(
      twiml.response(
        twiml.say(
          "hi there!",
          {voice: 'woman'}
        )
      )
    )
    should.equal(
      out,
      `<?xml version='1.0' encoding='UTF-8'?><Response><Say voice="woman">hi there!</Say></Response>`
    )
    done();
  })
  it('should play, say, and play', function(done) {
    let out = twiml.xmlResponse(
      twiml.response(
        [
          twiml.say("hi!", {voice: 'woman'}),
          twiml.play("hi.mp3"),
          twiml.say("bye!", {voice: 'woman'}),
        ]
      )
    )
    should.equal(
      out,
      `<?xml version='1.0' encoding='UTF-8'?><Response><Say voice="woman">hi!</Say><Play>hi.mp3</Play><Say voice="woman">bye!</Say></Response>`
    )
    done();
  })
})
