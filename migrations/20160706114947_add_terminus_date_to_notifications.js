
exports.up = function (knex, Promise) {
  return Promise.all([

    // Create a new col for notifications that holds terminus date for repeat
    knex.raw('ALTER TABLE notifications ADD COLUMN repeat_terminus TIMESTAMPTZ;'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    // Remove col from notifications that holds terminus date for repeat
    knex.raw('ALTER TABLE notifications DROP COLUMN IF EXISTS repeat_terminus;'),

  ]);
};
