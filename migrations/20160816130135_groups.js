
exports.up = function (knex, Promise) {
  return Promise.all([

    // Get rid of old groups table design
    knex.schema.dropTableIfExists('group_members'),
    knex.schema.dropTableIfExists('groups'),

    knex.schema.createTable('groups', (table) => {
      table.increments('group_id').primary();

      table.string('name');

      table.integer('user')
           .references('cmid')
           .inTable('cms');

      table.boolean('active').defaultTo(true);
      table.timestamp('created').defaultTo(knex.fn.now());
    }),

    knex.schema.createTable('group_members', (table) => {
      table.increments('group_member_id').primary();

      table.integer('group')
           .references('group_id')
           .inTable('groups');

      table.integer('client')
           .references('clid')
           .inTable('clients');

      table.boolean('active').defaultTo(true);
      table.timestamp('created').defaultTo(knex.fn.now());
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('groups'),
    knex.schema.dropTable('group_members'),
    knex.schema.createTable('groups', (table) => {
      table.increments('group_id').primary();

      table.integer('org')
           .references('orgid')
           .inTable('orgs');

      table.string('name');
      table.string('color');

      table.integer('owner')
           .references('cmid')
           .inTable('cms');

      table.integer('created_by')
           .references('cmid')
           .inTable('cms');

      table.boolean('active').defaultTo(true);

      table.timestamp('created').defaultTo(knex.fn.now());
    }),

  ]);
};
