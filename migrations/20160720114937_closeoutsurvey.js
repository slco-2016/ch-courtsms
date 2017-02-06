
exports.up = function (knex, Promise) {
  return Promise.all([

    knex.schema.createTable('client_closeout_surveys', (table) => {
      table.increments('survey_id').primary();

      table.integer('client')
           .references('clid')
           .inTable('clients');

      table.string('closeout_status');
      table.string('most_common_method');
      table.integer('likelihood_success_without_cc');
      table.string('helpfulness_of_cc');
      table.text('most_often_discussed');

      table.timestamp('created').defaultTo(knex.fn.now());
    }),


  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('client_closeout_surveys'),

  ]);
};
