var config = require('../../knexfile');
var knex = require("knex")(config['testing']);

require("colors")

before(function(done) {
  console.log("Running test/app/_init.js first (hopefully)".green)  
  knex.seed.run().then(() => done())
})
