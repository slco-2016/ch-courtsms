
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.createTable('recordings', (table) => {
      table.increments('id').primary();

      table.text('recording_key');
      table.text('call_to');
      table.text('RecordingSid');
      table.text('transcription');

      table.integer('comm_id')
        .references('commid')
        .inTable('comms');

      table.timestamp('updated');
      table.timestamp('created').defaultTo(knex.fn.now());
    }),
    knex.schema.table('msgs', (table) => {
      table.integer('recording_id')
        .references('id')
        .inTable('recordings');
    }),
  ]);
};


exports.down = function (knex, Promise) {
  return Promise.all([

    knex.schema.dropTable('recordings'),
    knex.raw('ALTER TABLE msgs DROP COLUMN IF EXISTS recording_id;'),
  ]);
};

