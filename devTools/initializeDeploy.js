#!/usr/bin/env node
// usage: ./devTools/initializeDeploy.js --multnomah
const db = require('../app/db');
const readline = require('readline');
const credentials = require('../credentials');
const hashPw = require('../app/lib/pass').hashPw;

const ask = (prompt, callback) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(prompt, (answer) => {
    callback(answer);
    rl.close();
  });
};

let ORG_NAME, ORG_EMAIL, ORG_TZ, DEPT_NAME, CFA_FIRST_NAME,
  CFA_LAST_NAME;

if (process.argv[2] === '--multnomah') {
  ORG_NAME = 'Multnomah County';
  ORG_EMAIL = 'clientcomm@codeforamerica.org';
  ORG_TZ = 'America/Los_Angeles';
  DEPT_NAME = 'Department of Community Justice';
  CFA_FIRST_NAME = 'Code for';
  CFA_LAST_NAME = 'America';
} else {
  throw new Error('No deploy information set! Call this script with an argument.');
}

// create an organization
const org = {
  name: ORG_NAME,
  phone: 1,
  email: ORG_EMAIL,
  expiration: '2100-01-01 00:00:00+00',
  allotment: 10,
  created: new Date(),
  tz: ORG_TZ,
};

// create a department
const department = {
  organization: 1,
  name: DEPT_NAME,
  phone_number: 1,
  created_by: 1,
  active: true,
};

// create a superuser
const owner = {
  org: 1,
  first: CFA_FIRST_NAME,
  last: CFA_LAST_NAME,
  position: 'Officer',
  admin: true,
  active: true,
  superuser: true,
  class: 'owner',
};

// phone number
const phoneNumber = {
  value: credentials.twilioNum,
  organization: 1,
};

ask(`Login email for superuser? `, (user) => {
  ask(`Login Password for ${user}? `, (pw) => {
    owner.email = user;
    owner.pass = hashPw(pw);

    // these need to be inserted in this order in order to satisfy foreign key
    // constraints
    db('orgs').insert(org)
      .then(() => db('cms').insert(owner))
      .then(() => db('phone_numbers').insert(phoneNumber))
      .then(() => db('departments').insert(department))
      .then(() => {
        console.log('Created Org, Department, and User!');
        process.exit(0);
      })
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  });
});
