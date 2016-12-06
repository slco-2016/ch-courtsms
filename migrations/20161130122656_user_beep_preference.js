
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('cms', function(table) {
      table.boolean('alert_beep').defaultTo(false);
    }),
  ]);  
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('ALTER TABLE cms DROP COLUMN IF EXISTS alert_beep;'),
  ]);
};
