
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE clients ALTER COLUMN dob TYPE date'),

  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE clients ALTER COLUMN dob TYPE timestamptz'),

  ]);
};
