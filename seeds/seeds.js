const seedFile = require('knex-seed-file');

exports.seed = function(knex, Promise) {
  return Promise.join(
    // Deletes ALL existing entries
    knex('orgs').del(), 

    let orgData = {
        orgid: 1, 
        name: 'Eample CJS',
        email: "test@test.com",
        expiration: "2018-01-01 00:00:00+00",
        allotment: 10,
        created: "2016-03-23 07:05:49.381857+00",
        tz: "America/Denver",
    }

    // "times they are a changin'"
    orgData.map((org) => {
        return knex('orgs').insert(org)
    })
  );
};
