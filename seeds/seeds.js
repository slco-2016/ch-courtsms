/* eslint-disable no-console */
require('colors');

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

const primaryOne = {
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

const primaryTwo = {
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

const clientOne = {
  cm: 2,
  first: 'Sandra',
  middle: 'M',
  last: 'Arriba',
  dob: '1977-03-02',
  so: 123,
  otn: 456,
  active: true,
};

const clientTwo = {
  cm: 2,
  first: 'Harry',
  middle: 'K',
  last: 'Arson',
  dob: '1937-05-09',
  so: 134,
  otn: 989086,
  active: true,
};

const clientThree = {
  cm: 2,
  first: 'Flavie',
  middle: 'Q',
  last: 'Cooper',
  dob: '1972-02-22',
  so: 942,
  otn: 834671,
  active: true,
};

// an inactive client
const clientFour = {
  cm: 2,
  first: 'Sofia',
  middle: 'D',
  last: 'Jolly',
  dob: '1957-12-30',
  so: 952,
  otn: 472936,
  active: false,
};

const contactMethodCellOne = {
  description: 'cell one',
  type: 'cell',
  value: '12433133609',
};

const contactMethodCellTwo = {
  description: 'cell two',
  type: 'cell',
  value: '12438384828',
};

const contactMethodCellThree = {
  description: 'cell three',
  type: 'cell',
  value: '12439562548',
};

const contactMethodEmail = {
  description: 'email one',
  type: 'email',
  value: 'max.t.mcdonnell@gmail.com',
};

// connecting the same cell to two different clients will create a
// conversation assignment conflict which is tested for in smsController
const commConnCellOneClientOne = {
  client: 1,
  comm: 1,
  name: 'commconn cell one for client one',
  retired: null,
};

const commConnCellOneClientTwo = {
  client: 2,
  comm: 1,
  name: 'commconn cell one for client two',
  retired: null,
};

const commConnEmailClientTwo = {
  client: 2,
  comm: 3,
  name: 'commconn email and client two',
  retired: null,
};

const commConnCellTwoClientThree = {
  client: 3,
  comm: 2,
  name: 'cell two for client three',
  retired: null,
};

const commConnCellThreeClientFour = {
  client: 4,
  comm: 3,
  name: 'cell three for client four',
  retired: null,
};

const convoOne = {
  cm: 2,
  client: 2,
  subject: 'primary and client two conversation',
  open: true,
  accepted: true,
};

const convoTwo = {
  cm: 2,
  client: 3,
  subject: 'primary and client three conversation',
  open: true,
  accepted: true,
};

const convoThree = {
  cm: 2,
  client: 4,
  subject: 'primary and client four conversation',
  open: true,
  accepted: true,
};

const messageEmailConvoOne = {
  convo: 1,
  comm: 3,
  content: 'this is a seeds email message',
  tw_sid: '<2013FAKE82626.18666.16540@clientcomm.org>',
  tw_status: 'queued',
};

const MessageSmsConvoTwo = {
  convo: 2,
  comm: 2,
  content: 'this is an sms message from client 3 to cm 2',
  tw_sid: 'SM6e5577f912e8c2bb137011375ac6a91e',
  tw_status: 'queued',
};

const MessageSmsConvoThree = {
  convo: 3,
  comm: 3,
  content: 'this is an sms message from client 4 to cm 2',
  tw_sid: 'SM6e5577f695f8c2bb137011375ac6a91e',
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
  message: 'Brush teeth',
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
  message: 'Brush teeth again',
  send: '2016-09-29 17:07:11.726-04',
  repeat: null,
  frequency: null,
  sent: false,
  closed: false,
  repeat_terminus: null,
  ovm_id: null,
};

// SECOND ORGANIZATION

const orgTwo = {
  name: 'Second CJS',
  phone: 2,
  email: 'secondcjs@example.com',
  expiration: '2018-01-01 00:00:00+00',
  allotment: 10,
  created: '2016-03-23 07:05:49.381857+00',
  tz: 'America/Denver',
};

const phoneNumberOrgTwo = {
  organization: 2,
  value: 13425678910,
};

const ownerOrgTwo = {
  org: 2,
  first: 'Second Test Account',
  last: 'To Remove',
  email: 'owner@example.com',
  pass: '$2a$08$LU2c2G3e1L/57JSP3q/Ukuz1av2DXmj6oDUgmNWmAdxTPG5aA/gti', // 123
  position: 'Officer',
  department: 2,
  admin: false,
  active: true,
  superuser: false,
  class: 'owner',
};

const departmentOrgTwo = {
  organization: 2,
  name: 'Pretrial JEOFBAUnique',
  phone_number: 2,
  created_by: 2,
  active: true,
};

const supervisorOrgTwo = {
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

const DepSupOrgTwo = {
  department: 2,
  supervisor: 4,
  active: true,
};

const clientOrgTwo = {
  cm: 4,
  first: 'Delilah',
  middle: 'X',
  last: 'Williams',
  dob: '1992-12-12',
  so: 123,
  otn: 456,
  active: true,
};

const commOrgTwo = {
  description: 'second org comm device',
  type: 'cell',
  value: '10900848392',
};

const commconnOrgTwo = {
  client: 3,
  comm: 4,
  name: "jim's cell phone",
  retired: null,
};

const notificationOrgTwo = {
  cm: 4, // secondDepartmentSupervisorLink's id
  client: 3, // clientOrgTwo's id
  comm: 4,
  subject: 'test',
  message: 'ship shap shaloop',
  send: '2016-07-08 04:30:00', // intentionally in the past
  // repeat ignored
  // frequency ignored
};

exports.seed = knex => {
  console.log('Running seeds.js'.yellow);
  console.log('Deleting all tables'.yellow);

  if (process.env.CCENV === 'testing') {
    return knex
      .raw(
        `DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;`
      )
      .then(() => {
        console.log('Knex DB: migrate latest');
        return knex.migrate.latest();
      })
      .then(() => {
        console.log('Inserting seed data'.yellow);
        return knex('orgs').insert(org);
      })
      .then(() => knex('phone_numbers').insert(phoneNumber))
      .then(() => knex('cms').insert(owner))
      .then(() => knex('departments').insert(dep))
      .then(() => knex('cms').insert(primaryOne))
      .then(() => knex('cms').insert(primaryTwo))
      .then(() => knex('clients').insert(clientOne))
      .then(() => knex('clients').insert(clientTwo))
      .then(() => knex('clients').insert(clientThree))
      .then(() => knex('clients').insert(clientFour))
      .then(() => knex('comms').insert(contactMethodCellOne))
      .then(() => knex('comms').insert(contactMethodEmail))
      .then(() => knex('comms').insert(contactMethodCellTwo))
      .then(() => knex('comms').insert(contactMethodCellThree))
      .then(() => knex('commconns').insert(commConnCellOneClientOne))
      .then(() => knex('commconns').insert(commConnCellOneClientTwo))
      .then(() => knex('commconns').insert(commConnEmailClientTwo))
      .then(() => knex('commconns').insert(commConnCellTwoClientThree))
      .then(() => knex('commconns').insert(commConnCellThreeClientFour))
      .then(() => knex('convos').insert(convoOne))
      .then(() => knex('convos').insert(convoTwo))
      .then(() => knex('convos').insert(convoThree))
      .then(() => knex('msgs').insert(messageEmailConvoOne))
      .then(() => knex('msgs').insert(MessageSmsConvoTwo))
      .then(() => knex('msgs').insert(MessageSmsConvoThree))
      .then(() => knex('outbound_voice_messages').insert(outboundVoiceMessage))
      .then(() => knex('notifications').insert(notificationSmartSend))
      .then(() => knex('notifications').insert(notification))
      .then(() => knex('orgs').insert(orgTwo))
      .then(() => knex('phone_numbers').insert(phoneNumberOrgTwo))
      .then(() => knex('departments').insert(departmentOrgTwo))
      .then(() => knex('cms').insert(ownerOrgTwo))
      .then(() => knex('cms').insert(supervisorOrgTwo))
      .then(() => knex('department_supervisors').insert(DepSupOrgTwo))
      .then(() => knex('clients').insert(clientOrgTwo))
      .then(() => knex('comms').insert(commOrgTwo))
      .then(() => knex('commconns').insert(commconnOrgTwo))
      .then(() => knex('notifications').insert(notificationOrgTwo))
      .catch(err => {
        throw err;
      });
  }
  throw new Error('Not the testing db!!'.red);
};
