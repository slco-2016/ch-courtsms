
exports.up = function (knex, Promise) {
  return Promise.all([

    // Create a new col for timezone
    knex.raw(`
              ALTER TABLE cms 
                ADD COLUMN is_away BOOLEAN default FALSE,
                ADD COLUMN away_message TEXT default 'I am currently out of office. I will respond as soon as possible.';
            `),

  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([

    // Remove the timezone column, you will lose that data
    knex.raw(`
              ALTER TABLE cms 
                DROP COLUMN IF EXISTS is_away,
                DROP COLUMN IF EXISTS away_message;
            `),

  ]);
};
