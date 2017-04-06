const credentials = require('../credentials');
const env = credentials.CCENV;

const config = require('../knexfile');
const knex = require('knex')(config[env]);

if (process.env.DEBUG_SQL === '1') {
  knex.on('query', (query) => {
    // eslint-disable-next-line
    console.log(query.sql, 'binds:', query.binds);
  });
}

module.exports = knex;
