// Update with your config settings.
const credentialsDB = require('./credentials').db;
const USER = credentialsDB.user;
const PASS = credentialsDB.password;
const HOST = credentialsDB.host;
const localDbUser = require('./credentials').localDbUser;

module.exports = {

  testing: {
    client: 'postgresql',
    connection: {
      user: localDbUser,
      database: 'cctest',
    },
  },

  // Development and host are now the same, they just reference different Amazong RDS PG instances
  development: {
    client: 'postgresql',
    connection: {
      host: HOST,
      port: '5432',
      database: 'clientcomm',
      user: USER,
      password: PASS,
    },

    pool: {
      min: 2,
      max: 10,
    },

    migrations: {
      tableName: 'knex_migrations',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      host: HOST,
      port: '5432',
      database: 'clientcomm',
      user: USER,
      password: PASS,
    },

    pool: {
      min: 2,
      max: 10,
    },

    migrations: {
      tableName: 'knex_migrations',
    },
  },

};
