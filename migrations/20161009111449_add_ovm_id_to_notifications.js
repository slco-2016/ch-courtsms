
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.table('notifications', (table) => {
      table.integer('ovm_id')
        .references('id')
        .inTable('outbound_voice_messages');
    }),
  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE notifications DROP COLUMN IF EXISTS ovm_id;'),
  ]);
};
