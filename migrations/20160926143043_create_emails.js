
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable("emails", function(table) {

      table.increments("id").primary();

      table.text("raw");
      table.text("cleanBody");
      table.string("from");
      table.string("to");

      table.integer("msg_id")
        .references("msgid")
        .inTable("msgs")

      table.timestamp("created").defaultTo(knex.fn.now());

    }),
  ])
};


exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("emails"),

  ]);
};