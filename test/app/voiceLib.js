const Users = require('../../app/models/users')
const voice = require('../../app/lib/voice')

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
})