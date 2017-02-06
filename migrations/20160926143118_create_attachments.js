
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.createTable('attachments', (table) => {
      table.increments('id').primary();

      table.string('key');
      table.string('contentType');

      table.integer('msg_id')
        .references('msgid')
        .inTable('msgs');

      table.timestamp('created').defaultTo(knex.fn.now());
    }),
  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('attachments'),

  ]);
};
