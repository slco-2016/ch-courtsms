
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE clients ADD COLUMN color_tag varchar(255) DEFAULT \'#898989\';'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE clients DROP COLUMN IF EXISTS color_tag;'),

  ]);
};
