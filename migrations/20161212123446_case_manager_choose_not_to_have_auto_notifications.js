
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('cms', function(table) {
      table.boolean('allow_automated_notifications').defaultTo(true);
    }),
  ]);  
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE cms DROP COLUMN IF EXISTS allow_automated_notifications;'),
  ]);
};
