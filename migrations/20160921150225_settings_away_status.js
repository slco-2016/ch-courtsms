
exports.up = function(knex, Promise) {
  return Promise.all([

    // Create a new col for timezone
    knex.raw(`
              ALTER TABLE templates 
                ADD COLUMN updated,
                ADD COLUMN col1  TIMESTAMPTZ default now(), 
                ADD COLUMN col2 int;
            `),

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    // Remove the timezone column, you will lose that data
    knex.raw(`
              ALTER TABLE templates 
                DROP COLUMN IF EXISTS updated;
            `),

  ])
};
