
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE emails DROP COLUMN IF EXISTS msg_id;'),
    knex.raw('ALTER TABLE attachments DROP COLUMN IF EXISTS msg_id;'),
    knex.schema.table('msgs', (table) => {
      table.integer('email_id')
        .references('id')
        .inTable('emails');
    }),
  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE msgs DROP COLUMN IF EXISTS email_id;'),
    knex.schema.table('emails', (table) => {
      table.integer('msg_id')
        .references('msgid')
        .inTable('msgs');
    }),
    knex.schema.table('attachments', (table) => {
      table.integer('msg_id')
        .references('msgid')
        .inTable('msgs');
    }),

  ]);
};
