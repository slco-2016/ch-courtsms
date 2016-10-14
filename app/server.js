const app = require('./app');

// START UP CLIENTCOMM
const port = 4000;
const server = app.listen(port, function () {
  console.log(`Listening on port ${port}.`.green);

  // Run super user check (after migrations)
  // TO DO: This method is hacky, there should be a callback at migrations completion
  // setTimeout(function () { require("../utils/superuser-check.js")(); }, 5000);
});


// EXPORT SERVER
module.exports = server;
