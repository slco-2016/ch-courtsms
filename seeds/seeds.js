const Promise = require('bluebird');

require('colors');

exports.seed = function (knex, Promise) {
  console.log('Running seeds.js'.yellow);
  console.log('Deleting all tables'.yellow);

  if (process.env.CCENV === 'testing') {
    return knex.raw(
      `DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;`,
    ).then(() => {
      console.log('Knex DB: migrate latest');
      return knex.migrate.latest();
    }).then(() => {
      console.log('Inserting seed data'.yellow);
      return knex('orgs').insert(org);
    }).then(() => knex('phone_numbers').insert(phoneNumber)).then(() => knex('cms').insert(owner)).then(() => knex('departments').insert(dep)).then(() => knex('cms').insert(primary)).then(() => knex('clients').insert(client)).then(() => knex('comms').insert(contactMethod)).then(() => knex('commconns').insert(commConn)).then(() => knex('cms').insert(secondPrimary)).then(() => knex('clients').insert(secondClient)).then(() => knex('comms').insert(secondContactMethod)).then(() => knex('commconns').insert(secondCommConn)).then(() => knex('comms').insert(emailContactMethod)).then(() => knex('commconns').insert(emailCommConn)).then(() => knex('convos').insert(conversation)).then(() => knex('msgs').insert(outboundEmailMessage)).then(() => knex('outbound_voice_messages').insert(outboundVoiceMessage)).then(() => knex('notifications').insert(notificationSmartSend)).then(() => knex('notifications').insert(notification),

    // SECOND ORGANIZATION
    ).then(() => knex('orgs').insert(secondOrg)).then(() => knex('phone_numbers').insert(secondPhoneNumber)).then(() => knex('departments').insert(secondDep)).then(() => knex('cms').insert(secondOwner)).then(() => knex('cms').insert(secondSupervisor)).then(() => knex('department_supervisors').insert(secondDepartmentSupervisorLink)).then(() => knex('clients').insert(secondOrgClient)).then(() => knex('comms').insert(secondOrgClientCommunicationMethod)).then(() => knex('commconns').insert(secondOrgClientCommunicationConnection)).then(() => knex('notifications').insert(notificationToBeSentOnBehalfOfSecondSupervisor)).catch((err) => {
      throw err;
    });
  }
  throw new Error('Not the testing db!!'.red);
};

const phoneNumber = {
  organization: 1,
  value: 12435678910,
};

const org = {
  name: 'Example CJS',
  phone: 1,
  email: 'test@test.com',
  expiration: '2018-01-01 00:00:00+00',
  allotment: 10,
  created: '2016-03-23 07:05:49.381857+00',
  tz: 'America/Denver',
};

const owner = {
  org: 1,
  first: 'Test Account',
  last: 'To Remove',
  email: 'owner@test.com',
  pass: '$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti', // 123
  position: 'Officer',
  admin: false,
  active: true,
  superuser: false,
  class: 'owner',
};

const dep = {
  organization: 1,
  name: 'Pretrial LKJKLJUnique',
  phone_number: 1,
  created_by: 1,
  active: true,
};

const primary = {
  org: 1,
  first: 'Test Account',
  last: 'To Remove',
  email: 'primary@test.com',
  pass: '$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti', // 123
  position: 'Officer',
  admin: false,
  active: true,
  superuser: false,
  class: 'primary',
  department: 1,
};

const secondPrimary = {
  org: 1,
  first: 'Other',
  last: 'Fellah',
  email: 'jamsession334@test.com',
  pass: '$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti', // 123
  position: 'Officer',
  admin: false,
  active: true,
  superuser: false,
  class: 'primary',
  department: 1,
};

const client = {
  cm: 2,
  first: 'Sandra',
  middle: 'M',
  last: 'Arriba',
  dob: '1977-03-02',
  so: 123,
  otn: 456,
  active: true,
};

const secondClient = {
  cm: 2,
  first: 'Harry',
  middle: 'K',
  last: 'Arson',
  dob: '1937-05-09',
  so: 134,
  otn: 989086,
  active: true,
};

const contactMethod = {
  description: 'DummyFoo2',
  type: 'cell',
  value: '12033133609',
};

const secondContactMethod = {
  description: 'HurtLocker',
  type: 'cell',
  value: '12048384828',
};

const emailContactMethod = {
  description: 'HurtLocker',
  type: 'email',
  value: 'max.t.mcdonnell@gmail.com',
};

const commConn = {
  client: 1,
  comm: 1,
  name: 'Example',
  retired: null,
};

const secondCommConn = {
  client: 2,
  comm: 1,
  name: 'RedundantMaybe',
  retired: null,
};

const emailCommConn = {
  client: 2,
  comm: 3,
  name: 'hmm',
  retired: null,
};

const conversation = {
  cm: 2,
  client: 2,
  subject: 'primary and secondClient conversation',
  open: true,
  accepted: true,
};

const outboundEmailMessage = {
  convo: 1,
  comm: 3,
  content: 'this is a seeds email message',
  tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>',
  tw_status: 'queued',
};

const outboundVoiceMessage = {
  delivery_date: '2016-09-29 17:07:11.726-04',
  recording_key: '2oc0hpy2j32e3rgm0a4i-REde2dd4be0e7a521f8296a7390a9ab21b',
  RecordingSid: 'REde2dd4be0e7a521f8296a7390a9ab21b',
  delivered: false,
  commid: 1,
  call_sid: 'CX4042ffc8b5de3dfcd0d85e57cec02605',
};

const notificationSmartSend = {
  cm: 2,
  client: 1,
  comm: null,
  subject: 'Reminder',
  message: 'Bursh teeth',
  send: '2016-09-29 17:07:11.726-04',
  repeat: null,
  frequency: null,
  sent: false,
  closed: false,
  repeat_terminus: null,
  ovm_id: null,
};

const notification = {
  cm: 2,
  client: 1,
  comm: 1,
  subject: 'Reminder2',
  message: 'Bursh teeth again',
  send: '2016-09-29 17:07:11.726-04',
  repeat: null,
  frequency: null,
  sent: false,
  closed: false,
  repeat_terminus: null,
  ovm_id: null,
};

// SECOND ORGANIZATION

const secondOrg = {
  name: 'Second CJS',
  phone: 2,
  email: 'secondcjs@example.com',
  expiration: '2018-01-01 00:00:00+00',
  allotment: 10,
  created: '2016-03-23 07:05:49.381857+00',
  tz: 'America/Denver',
};

const secondPhoneNumber = {
  organization: 2,
  value: 13425678910,
};

const secondOwner = {
  org: 2,
  first: 'Second Test Account',
  last: 'To Remove',
  email: 'secondOwner@example.com',
  pass: '$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti', // 123
  position: 'Officer',
  department: 2,
  admin: false,
  active: true,
  superuser: false,
  class: 'owner',
};

const secondDep = {
  organization: 2,
  name: 'Pretrial JEOFBAUnique',
  phone_number: 2,
  created_by: 2,
  active: true,
};

const secondSupervisor = {
  org: 2,
  first: 'Supervisor Test Account',
  last: 'To Remove',
  email: 'secondsupervisor@example.com',
  pass: '$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti', // 123
  position: 'Manager',
  admin: false,
  active: true,
  superuser: false,
  class: 'supervisor',
  department: 2,
};

const secondDepartmentSupervisorLink = {
  department: 2,
  supervisor: 4,
  active: true,
};

const secondOrgClient = {
  cm: 4,
  first: 'Delilah',
  middle: 'X',
  last: 'Williams',
  dob: '1992-12-12',
  so: 123,
  otn: 456,
  active: true,
};

const secondOrgClientCommunicationMethod = {
  description: 'second org comm device',
  type: 'cell',
  value: '10900848392',
};

const secondOrgClientCommunicationConnection = {
  client: 3,
  comm: 4,
  name: 'jim\'s cell phone',
  retired: null,
};

const notificationToBeSentOnBehalfOfSecondSupervisor = {
  cm: 4,     // secondDepartmentSupervisorLink's id
  client: 3, // secondOrgClient's id
  comm: 4,
  subject: 'test',
  message: 'ship shap shaloop',
  send: '2016-07-08 04:30:00', // intentionally in the past
  // repeat ignored
  // frequency ignored
};
