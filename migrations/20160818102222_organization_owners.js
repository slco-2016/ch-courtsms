
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('organization_owners', (table) => {
      table.increments('owner_id').primary();

      table.integer('organization')
           .references('orgid')
           .inTable('orgs');

      table.integer('owner')
           .references('cmid')
           .inTable('cms');

      table.boolean('active').defaultTo(true);
      table.timestamp('created').defaultTo(knex.fn.now());
    }),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('organization_owners'),

  ]);
};
