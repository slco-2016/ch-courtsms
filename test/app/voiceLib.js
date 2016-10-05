const supertest = require('supertest');
const moment = require('moment')

const Users = require('../../app/models/users')
const voice = require('../../app/lib/voice')
const twilioRecordingRequest = require('../data/twilioVoiceRecording.js')
const OutboundVoiceMessages = require('../../app/models/outboundVoiceMessages')

const ngrokTestServer = require('../ngrokTestServer')

let ngrokUrl;

describe.skip('Voice lib checks', function() {

  before(function(done) {
    const app = require('../../app/app')
    let server = app.listen(4000, function() {
      ngrokTestServer(4000, function(url) {
        ngrokUrl = url
        done()
      })
    })
  })

  it('Should be able to call me to leave a message', function(done) {
    this.timeout(100000)
    let deliveryDate = new Date()
    let userQuery = Users.findById(2)
    userQuery.then((user) => {
      return user.getClients()
    }).then((clients) => {
      return voice.recordVoiceMessage(
        ngrokUrl,
        userQuery.value(),
        clients[0],
        deliveryDate,
        "+12033133609"
      )
    }).then((call) => {
      let i = setInterval(function() {
        OutboundVoiceMessages.getNeedToBeSent()
        .then((ovms) => {
          ovms.forEach(function(ovm) {
            if (ovm.delivery_date > moment().subtract(1, 'minute')) {
              clearInterval(i)
              done()
            }
          })
        })
      }, 1000)
    })
  })

  it('Should send messages that need to be sent', function(done) {
    this.timeout(100000)
    voice.sendPendingOutboundVoiceMessages(ngrokUrl)
    .then((obvs) => {
      let i = setInterval(function() {
        OutboundVoiceMessages.findOneByAttribute('delivered', true)
        .then((ovm) => {
          if (ovm) {
            done()
            clearInterval(i)
          }
        })
      }, 1000)
    })
  })

})