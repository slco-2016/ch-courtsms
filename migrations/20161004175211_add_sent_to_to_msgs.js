
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table("msgs", function(table) {
      table.text("sent_to")
    }),
  ]);  
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw("ALTER TABLE msgs DROP COLUMN IF EXISTS sent_to;"),
  ]);
};
