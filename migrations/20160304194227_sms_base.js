
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.schema.createTable("orgs", function(table) {
      table.increments("orgid").primary();

      table.string("name");
      table.integer("phone");
      table.string("email");

      table.dateTime("expiration").defaultTo("2100-01-01");
      table.integer("allotment").defaultTo(10);
      
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("cms", function(table) {
      table.increments("cmid").primary();

      table.integer("org")
           .references("orgid")
           .inTable("orgs");

      table.string("first");
      table.string("middle").defaultTo("");
      table.string("last");

      table.string("email");
      table.string("pass");

      table.string("position");
      table.string("department");

      table.boolean("admin").defaultTo(false);
      table.boolean("active").defaultTo(true);

      table.boolean("superuser").defaultTo(false);
      
      table.timestamp("updated").defaultTo(knex.fn.now());
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("clients", function(table) {
      table.increments("clid").primary();

      table.integer("cm")
           .references("cmid")
           .inTable("cms");

      table.string("first");
      table.string("middle").defaultTo("");
      table.string("last");

      table.string("dob"); // YYYY-MM-DD format
      table.string("otn");
      table.string("so");

      table.boolean("active").defaultTo(true);
      
      table.timestamp("updated").defaultTo(knex.fn.now());
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("convos", function(table) {
      table.increments("convid").primary();

      table.integer("cm")
           .references("cmid")
           .inTable("cms");

      table.integer("client")
           .references("clid")
           .inTable("clients");

      table.string("subject");

      table.boolean("open").defaultTo(true);
      table.boolean("accepted").defaultTo(false);

      table.timestamp("updated").defaultTo(knex.fn.now());
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("msgs", function(table) {
      table.increments("msgid").primary();

      table.integer("convo")
           .references("convid")
           .inTable("convos");

      table.integer("comm")
           .references("commid")
           .inTable("comms");
           
      table.string("content");

      table.boolean("inbound").defaultTo(false);
      table.boolean("read").defaultTo(false);

      // twilio specific data
      table.string("tw_sid");
      table.string("tw_status");

      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("commconns", function (table) {
      table.increments("commconnid").primary();

      table.integer("client")
           .references("clid")
           .inTable("clients");

      table.integer("comm")
           .references("commid")
           .inTable("comms");

      table.string("name");

      table.dateTime("retired");
      table.timestamp("created").defaultTo(knex.fn.now());
    }),

    knex.schema.createTable("comms", function (table) {
      table.increments("commid").primary();

      table.string("type");        // e.g. email, cell, landline
      table.string("value");       // e.g. jim@email.com, 14542348723
      table.string("description"); // e.g. Joe's Obamaphone

      table.timestamp("updated").defaultTo(knex.fn.now());
      table.timestamp("created").defaultTo(knex.fn.now());
    }),


  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("cms"),
    knex.schema.dropTable("clients"),
    knex.schema.dropTable("convos"),
    knex.schema.dropTable("msgs"),
    knex.schema.dropTable("comms"),
    knex.schema.dropTable("leads")

  ]);
};
