'use strict';
var env = process.env.CCENV || "development";

console.log("Knex configuration environment: " + env);
var config = require('../knexfile');
var knex = require("knex")(config[env]);

module.exports = knex;