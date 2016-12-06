
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE orgs ALTER COLUMN phone TYPE varchar(255)'),

  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE orgs ALTER COLUMN phone TYPE int4'),

  ]);
};
