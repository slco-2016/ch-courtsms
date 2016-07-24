
exports.up = function(knex, Promise) {
  return Promise.all([

    // Create a new col for timezone
    knex.raw("ALTER TABLE templates ADD COLUMN updated TIMESTAMPTZ default now();"),

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    // Remove the timezone column, you will lose that data
    knex.raw("ALTER TABLE templates DROP COLUMN IF EXISTS updated;"),

  ])
};
