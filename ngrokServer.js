process.env.CCENV = "testing"

var config = require('./knexfile');
var knex = require("knex")(config['testing']);

const ngrokTestServer = require('./test/ngrokTestServer')
const app = require('./app/app')
const mailgun = require('./app/lib/mailgun')

knex.seed.run().then(() => {
  // app.listen(4000, function() {
    ngrokTestServer(4000, function(url) {
      mailgun.updateWebhooks(url)
      .then(() => {
        console.log("All webhooks updated, server is up at: ", url)  
      })
    })
  // })
}).catch((err) => {
  throw err
})


