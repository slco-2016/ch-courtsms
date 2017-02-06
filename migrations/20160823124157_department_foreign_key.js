
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE cms DROP COLUMN IF EXISTS department;'),
    knex.schema.table('cms', (table) => {
      table.integer('department')
           .references('department_id')
           .inTable('departments');
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.raw('ALTER TABLE cms DROP COLUMN IF EXISTS department;'),
    knex.schema.table('cms', (table) => {
      table.string('department');
    }),

  ]);
};
