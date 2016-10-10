
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table("attachments", function(table) {
      table.integer("email_id")
        .references("id")
        .inTable("emails")
    }),
  ]);  
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw("ALTER TABLE attachments DROP COLUMN IF EXISTS email_id;"),
  ]);
};
