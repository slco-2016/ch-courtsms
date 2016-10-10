
exports.up = function(knex, Promise) {
  return Promise.all([

    // Create a new col for timezone
    knex.raw("ALTER TABLE groups ADD COLUMN last_used TIMESTAMPTZ default now();"),

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    // Remove the timezone column, you will lose that data
    knex.raw("ALTER TABLE groups DROP COLUMN IF EXISTS last_used;"),

  ])
};
