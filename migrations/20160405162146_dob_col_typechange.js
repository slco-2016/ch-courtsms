
exports.up = function (knex, Promise) {
  return Promise.all([

    // Alter dob col type to datetime
    knex.raw('ALTER TABLE clients ALTER COLUMN dob TYPE TIMESTAMP WITH TIME ZONE USING to_timestamp(dob, \'YYYY-MM-DD HH24:MI:SS\')'),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    // Return dob col type to string
    knex.raw('ALTER TABLE clients ALTER COLUMN dob TYPE varchar(255)'),

  ]);
};
