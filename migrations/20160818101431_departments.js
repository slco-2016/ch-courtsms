
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('departments', (table) => {
      table.increments('department_id').primary();

      table.integer('organization')
           .references('orgid')
           .inTable('orgs');

      table.string('name');

      table.integer('phone_number')
           .references('phone_number_id')
           .inTable('phone_numbers');

      table.integer('created_by')
           .references('cmid')
           .inTable('cms');

      table.boolean('active').defaultTo(true);
      table.timestamp('created').defaultTo(knex.fn.now());
    }),

    knex.schema.createTable('department_supervisors', (table) => {
      table.increments('supervisor_id').primary();

      table.integer('department')
           .references('department_id')
           .inTable('departments');

      table.integer('supervisor')
           .references('cmid')
           .inTable('cms');

      table.boolean('active').defaultTo(true);
      table.timestamp('created').defaultTo(knex.fn.now());
    }),

    knex.schema.createTable('phone_numbers', (table) => {
      table.increments('phone_number_id').primary();

      table.integer('organization')
           .references('orgid')
           .inTable('orgs');

      table.timestamp('created').defaultTo(knex.fn.now());
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('departments'),
    knex.schema.dropTable('department_supervisors'),
    knex.schema.dropTable('phone_numbers'),

  ]);
};
