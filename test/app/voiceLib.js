const supertest = require('supertest');

const Users = require('../../app/models/users')
const voice = require('../../app/lib/voice')
const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')

describe('Voice checks', function() {

  xit('Should be able to call me to leave a message', function(done) {
    let deliveryDate = new Date()
    let userQuery = Users.findById(2)
    userQuery.then((user) => {
      return user.getClients()
    }).then((clients) => {
      return voice.recordVoiceMessage(
        userQuery.value(),
        clients[0],
        deliveryDate,
        "+12033133609"
      )
    }).then(() => {
      done()
    })
  })

  xit('Should send messages that need to be sent', function(done) {
    voice.sendPendingOutboundVoiceMessages()
    .then((obvs) => {
      console.log(obvs)
      done();
    })
  })

})