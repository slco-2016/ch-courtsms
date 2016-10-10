
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.schema.createTable("alerts_feed", function(table) {
      table.increments("alert_id").primary();

      table.integer("user")
           .references("cmid")
           .inTable("cms");

      table.integer("created_by")
           .references("cmid")
           .inTable("cms");

      table.text("subject");
      table.text("message");
      
      table.boolean("open").defaultTo(true);
      table.timestamp("created").defaultTo(knex.fn.now());
    })


  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("alerts_feed")

  ]);
};
