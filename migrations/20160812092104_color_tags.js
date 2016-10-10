
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.schema.createTable("color_tags", function(table) {
      table.increments("color_tag_id").primary();;

      table.string("name");
      table.string("color");

      table.integer("created_by")
           .references("cmid")
           .inTable("cms");

      table.boolean("active").defaultTo(true);
      table.timestamp("created").defaultTo(knex.fn.now());
    })


  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("color_tags")

  ]);
};
