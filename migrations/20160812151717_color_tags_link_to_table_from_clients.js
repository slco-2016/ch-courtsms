
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.table('clients', (table) => {
      table.integer('color_tag')
           .references('color_tag_id')
           .inTable('color_tags');
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE clients DROP COLUMN IF EXISTS color_tag;'),

  ]);
};
