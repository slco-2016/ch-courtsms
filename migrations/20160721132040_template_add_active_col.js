
exports.up = function(knex, Promise) {
  return Promise.all([

    // Create a new col for whether or not template is active
    knex.raw("ALTER TABLE templates ADD COLUMN active BOOLEAN default TRUE;"),

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    // Remove the whether or not template is active column, you will lose that data
    knex.raw("ALTER TABLE templates DROP COLUMN IF EXISTS active;"),

  ])
};
