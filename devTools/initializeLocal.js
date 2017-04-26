#!/usr/bin/env node
// usage: ./devTools/initializeLocal.js
const db = require('../app/db');
const readline = require('readline');
const credentials = require('../credentials');
const hashPw = require('../app/lib/pass').hashPw;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let ORG_NAME, ORG_EMAIL, ORG_TZ, DEPT_NAME, SU_FIRST_NAME, SU_LAST_NAME;

ORG_NAME = 'Salt Lake County';
ORG_EMAIL = 'clientcomm@codeforamerica.org';
ORG_TZ = 'America/Denver';
DEPT_NAME = 'Criminal Justice Services';
SU_FIRST_NAME = 'Super';
SU_LAST_NAME = 'User';

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
  first: SU_FIRST_NAME,
  last: SU_LAST_NAME,
  position: 'Officer',
  admin: true,
  active: true,
  superuser: true,
  class: 'owner',
  email: '',
  pass: '',
};

// phone number
const phoneNumber = {
  value: '',
  organization: 1,
};

rl.question(`Twilio phone number for ${org.name}? `, pvalue => {
  rl.question(`Login email for superuser? `, user => {
    rl.question(`Login password for ${user}? `, pw => {
      owner.email = user;
      owner.pass = hashPw(pw);
      phoneNumber.value = pvalue;

      // these need to be inserted in this order in order to satisfy foreign key
      // constraints
      db('orgs')
        .insert(org)
        .then(() => db('cms').insert(owner))
        .then(() => db('phone_numbers').insert(phoneNumber))
        .then(() => db('departments').insert(department))
        .then(() => {
          console.log('Created Org, Department, and User!');
          rl.close();
          process.exit(0);
        })
        .catch(err => {
          console.error(err);
          rl.close();
          process.exit(1);
        });
    });
  });
});
