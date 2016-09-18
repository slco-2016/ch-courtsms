const Promise = require("bluebird");

require("colors");

exports.seed = function(knex, Promise) {
  console.log("Running seeds.js".yellow)
  console.log("Deleting all tables".yellow)

  if (process.env.CCENV === "testing") {
    return knex.raw(
      `DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;`
    ).then(() => {
      console.log("Running latest migrations".yellow)
      return knex.migrate.latest()
    }).then(() => {
      console.log("Inserting seed data".yellow)
      return knex('orgs').insert(org)
    }).then(() => {
      return knex('phone_numbers').insert(phoneNumber)
    }).then(() => {
      return knex('cms').insert(owner)
    }).then(() => {
      return knex('departments').insert(dep)
    }).then(() => {
      return knex('cms').insert(primary)
    }).catch((err) => {
      throw err
    });        
  } else {
    throw new Error("Not the testing db!!".red)
  }
}

let phoneNumber = {
  // phone_number_id: 1,
  organization: 1,
  value: 12435678910,
}

let org = {
  // orgid: 1, 
  name: 'Example CJS',
  phone: 1,
  email: "test@test.com",
  expiration: "2018-01-01 00:00:00+00",
  allotment: 10,
  created: "2016-03-23 07:05:49.381857+00",
  tz: "America/Denver",
}

let owner = {
  // cmid: 1,
  org: 1,
  first: "Test Account",
  last: "To Remove",
  email: "owner@test.com",
  pass: "$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti", //123
  position: "Officer",
  admin: false,
  active: true,
  superuser: false,
  class: "owner",
}

let dep = {
  // department_id: 1,
  organization: 1,
  name: "Pretrial LKJKLJUnique",
  phone_number: 1,
  created_by: 1,
  active: true,
}

let primary = {
  // cmid: 2,
  org: 1,
  first: "Test Account",
  last: "To Remove",
  email: "primary@test.com",
  pass: "$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti", //123
  position: "Officer",
  admin: false,
  active: true,
  superuser: false,
  class: "primary",
  department: 1,
}