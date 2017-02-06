
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.table('emails', (table) => {
      table.string('messageId');
    }),
  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE emails DROP COLUMN IF EXISTS messageId;'),
  ]);
};
