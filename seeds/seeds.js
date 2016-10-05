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
    }).then(() => {
      return knex('clients').insert(client)
    }).then(() => {
      return knex('comms').insert(contactMethod)
    }).then(() => {
      return knex('commconns').insert(commConn)
    }).then(() => {
      return knex('cms').insert(secondPrimary)
    }).then(() => {
      return knex('clients').insert(secondClient)
    }).then(() => {
      return knex('comms').insert(secondContactMethod)
    }).then(() => {
      return knex('commconns').insert(secondCommConn)
    }).then(() => {
      return knex('comms').insert(emailContactMethod)
    }).then(() => {
      return knex('commconns').insert(emailCommConn)
    }).then(() => {
      return knex('convos').insert(conversation)
    }).then(() => {
      return knex('msgs').insert(outboundEmailMessage)
    }).then(() => {
      return knex('outbound_voice_messages').insert(outboundVoiceMessage)
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

let secondPrimary = {
  org: 1,
  first: "Other",
  last: "Fellah",
  email: "jamsession334@test.com",
  pass: "$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti", //123
  position: "Officer",
  admin: false,
  active: true,
  superuser: false,
  class: "primary",
  department: 1,
}

let client = {
  cm: 2,
  first: 'Sandra',
  middle: 'M',
  last: 'Arriba',
  dob: '1977-03-02',
  so: 123,
  otn: 456,
  active: true,
}

let secondClient = {
  cm: 2,
  first: 'Harry',
  middle: 'K',
  last: 'Arson',
  dob: '1937-05-09',
  so: 134,
  otn: 989086,
  active: true,
}

let contactMethod = {
  description: 'DummyFoo2',
  type: 'cell',
  value: '12033133609',
}

let secondContactMethod = {
  description: 'HurtLocker',
  type: 'cell',
  value: '12048384828',
}

let emailContactMethod = {
  description: 'HurtLocker',
  type: 'email',
  value: 'max.t.mcdonnell@gmail.com',
}

let commConn = {
  client: 1,
  comm: 1,
  name: "Example",
  retired: null
}

let secondCommConn = {
  client: 2,
  comm: 1,
  name: "RedundantMaybe",
  retired: null
}

let emailCommConn = {
  client: 2,
  comm: 3,
  name: "hmm",
  retired: null
}

let conversation = {
  cm: 2,
  client: 2,
  subject: "primary and secondClient conversation",
  open: true,
  accepted: true,
}

let outboundEmailMessage = {
  convo: 1,
  comm: 3,
  content: "this is a seeds email message",
  tw_sid: "<2013FAKE82626.18666.16540@clientcomm.org>",
  tw_status: 'queued',
}

let outboundVoiceMessage = {
  delivery_date: "2016-09-29 17:07:11.726-04",
  recording_key: "2oc0hpy2j32e3rgm0a4i-REde2dd4be0e7a521f8296a7390a9ab21b",
  RecordingSid: "REde2dd4be0e7a521f8296a7390a9ab21b",
  delivered: false,
  client_id: 1,
}