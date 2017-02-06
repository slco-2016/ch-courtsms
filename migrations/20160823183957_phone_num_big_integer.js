
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.table('phone_numbers', (table) => {
      table.bigInteger('value');
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE phone_numbers DROP COLUMN IF EXISTS value;'),

  ]);
};
