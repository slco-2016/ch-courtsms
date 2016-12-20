const app = require('./app');

// START UP CLIENTCOMM
const port = 4000;
const server = app.listen(port, function () {
  console.log(`Listening on port ${port}.`.green);
});

// EXPORT SERVER
module.exports = server;
