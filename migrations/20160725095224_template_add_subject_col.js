
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE templates ADD COLUMN title varchar(255);'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE templates DROP COLUMN IF EXISTS title;'),

  ]);
};
