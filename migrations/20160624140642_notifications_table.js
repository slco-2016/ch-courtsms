
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('notifications', (table) => {
      table.increments('notificationid').primary();

      // Foreign keys
      table.integer('cm')
           .references('cmid')
           .inTable('cms');

      table.integer('client')
           .references('clid')
           .inTable('clients');

      table.integer('comm')
           .references('commid')
           .inTable('comms');

      // Content
      table.string('subject');
      table.text('message');

      // Time related content
      table.timestamp('created').defaultTo(knex.fn.now());
      table.timestamp('updated').defaultTo(knex.fn.now());

      table.timestamp('send');

      // Repeat options
      table.boolean('repeat').defaultTo(false);
      table.integer('frequency');

      // Book keeping
      table.boolean('sent').defaultTo(false);
      table.boolean('closed').defaultTo(false);
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('notifications'),

  ]);
};
