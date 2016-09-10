var env = "development";

// Update environment to use testing tools when applicable
var CCENV = process.env.CCENV;
if (CCENV) {
  env = CCENV;
}
console.log("Knex configuration environment: " + env);

var config = require('../knexfile');
var knex = require("knex")(config[env]);

module.exports = knex;
