const ngrokTestServer = require('./test/ngrokTestServer')
const app = require('./app/app')
let server = app.listen(4000, function() {
  ngrokTestServer(4000, function(url) {
    console.log(url)
  })
})

