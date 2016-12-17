'use strict';
const credentials = require('../credentials');
const env = credentials.CCENV;

const config = require('../knexfile');
const knex = require('knex')(config[env]);

module.exports = knex;