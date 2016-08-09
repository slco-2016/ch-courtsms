
exports.up = function(knex, Promise) {
  return Promise.all([

    knex.schema.createTable("ibm_sentiment_analysis", function(table) {
      table.increments("ibm_sentiment_analysis_id").primary();

      table.string("sentiment");
      table.string("ibm_request_sid");
      table.string("tw_sid");
    })

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([

    knex.schema.dropTable("ibm_sentiment_analysis")

  ]);
};
