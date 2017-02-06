
exports.up = function (knex, Promise) {
  return Promise.all([

    // Create a new col for timezone
    knex.raw('ALTER TABLE orgs ADD COLUMN tz varchar(255);'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    // Remove the timezone column, you will lose that data
    knex.raw('ALTER TABLE orgs DROP COLUMN IF EXISTS tz;'),

  ]);
};
