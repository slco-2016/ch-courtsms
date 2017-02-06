
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('template_use', (table) => {
      table.increments('template_use_id').primary();

      table.integer('template')
           .references('template_id')
           .inTable('templates');

      table.timestamp('used_on').defaultTo(knex.fn.now());

      table.integer('used_by')
           .references('cmid')
           .inTable('cms');

      table.integer('sent_to')
           .references('clid')
           .inTable('clients');
    }),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('template_use'),

  ]);
};
