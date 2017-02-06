
exports.up = function (knex, Promise) {
  return Promise.all([

    // Alter msgs col type to text cell
    knex.raw('ALTER TABLE msgs ALTER COLUMN content TYPE text'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    // Return msgs col type to varchar cell length 255
    knex.raw('ALTER TABLE msgs ALTER COLUMN content TYPE varchar(255)'),

  ]);
};

