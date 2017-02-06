
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.table('clients', (table) => {
      table.boolean('allow_automated_notifications').defaultTo(true);
    }),
  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE clients DROP COLUMN IF EXISTS allow_automated_notifications;'),
  ]);
};
