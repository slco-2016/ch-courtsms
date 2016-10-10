'use strict';
const env = process.env.CCENV || 'development';

console.log('Knex configuration environment: ' + env);
const config = require('../knexfile');
const knex = require('knex')(config[env]);

module.exports = knex;