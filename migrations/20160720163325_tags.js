
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.schema.createTable("tags", function(table) {
      table.increments("tag_id").primary();

      table.integer("org")
           .references("orgid")
           .inTable("orgs");

      table.integer("casemanager")
           .references("cmid")
           .inTable("cms");

      table.string("tag_name");
      
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("tag_relations", function(table) {
      table.increments("tag_relation_id").primary();

      table.integer("tag")
           .references("tag_id")
           .inTable("tags");

      table.integer("created_by")
           .references("cmid")
           .inTable("cms");

      table.integer("org")
           .references("orgid")
           .inTable("orgs");

      table.integer("casemanager")
           .references("cmid")
           .inTable("cms");

      table.integer("client")
           .references("clid")
           .inTable("clients");

      table.integer("convo")
           .references("convid")
           .inTable("convos");

      table.integer("commconn")
           .references("commconnid")
           .inTable("commconns");

      table.integer("template")
           .references("template_id")
           .inTable("templates");
      
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("tags"),
    knex.schema.dropTable("tag_relations")

  ]);
};
