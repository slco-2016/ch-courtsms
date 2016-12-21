var config = require('../../knexfile');
var knex = require("knex")(config['testing']);
require("colors");

before(function(done) {
  this.timeout(10000);
  knex.seed.run()
  .then(() => done())
  .catch((err) => {
    done(err);
  });
});
