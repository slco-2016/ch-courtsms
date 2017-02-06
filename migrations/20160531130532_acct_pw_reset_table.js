
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('pwresets', (table) => {
      table.increments('pwresid').primary();

      table.integer('cmid')
           .references('cmid')
           .inTable('cms');

      table.string('uid');
      table.string('email');

      table.dateTime('created').defaultTo(knex.fn.now());
      table.dateTime('expiration').defaultTo(knex.raw('NOW() + \'24 hours\' '));
    }),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('pwresets'),

  ]);
};
