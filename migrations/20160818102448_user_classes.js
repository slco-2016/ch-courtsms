
exports.up = function (knex, Promise) {
  return Promise.all([

    // Create a new col for timezone
    knex.raw('ALTER TABLE cms ADD COLUMN class varchar(255) DEFAULT \'primary\';'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    // Remove the timezone column, you will lose that data
    knex.raw('ALTER TABLE cms DROP COLUMN IF EXISTS class;'),

  ]);
};
