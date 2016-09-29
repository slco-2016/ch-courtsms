
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable("outbound_voice_messages", function(table) {

      table.increments("id").primary();

      table.timestamp("delivery_date");
      table.timestamp("last_delivery_attempt");
      table.text("recording_key");
      table.text("RecordingSid");
      table.boolean("delivered").defaultTo(false);

      table.integer("client_id")
        .references("clid")
        .inTable("clients")

      table.timestamp("updated");
      table.timestamp("created").defaultTo(knex.fn.now());

    }),
  ])
};


exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("outbound_voice_messages"),

  ]);
};