var config = require('./knexfile');
var knex = require("knex")(config['testing']);

const ngrokTestServer = require('./test/ngrokTestServer')
const app = require('./app/app')
knex.seed.run().then(() => {
  app.listen(4000, function() {
    ngrokTestServer(4000, function(url) {
      console.log(url)
    })
  })
}).catch((err) => {
  throw err
})


