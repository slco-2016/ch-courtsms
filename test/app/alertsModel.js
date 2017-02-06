const assert = require('assert');
const request = require('request');

const Alerts = require('../../app/models/alerts');
const Users = require('../../app/models/users');

require('colors');
const should = require('should');

// Base information
let createdBy = 1,
  targetUserId = 2,
  subject = 'Please remember',
  message = 'Please remember to work more on the things that are imporant';
describe('Attachment checks', () => {
  let a;

  it('should return an array, always of all alerts', (done) => {
    Alerts.findByUser(1)
    .then((alerts) => {
      alerts.length.should.be.greaterThan(-1);
      done();
    }).catch(done);
  });

  it('creating one for user should result in alert being populated in the db', (done) => {
    Alerts.createForUser(targetUserId, createdBy, subject, message)
    .then(() => Alerts.findByUser(targetUserId)).then((alerts) => {
      alerts.length.should.be.exactly(1);
      const alert = alerts[0];
      alert.user.should.be.exactly(targetUserId);
      alert.created_by.should.be.exactly(createdBy);
      alert.subject.should.be.exactly(subject);
      alert.message.should.be.exactly(message);
      alert.open.should.be.exactly(true);
      done();
    }).catch(done);
  });

  it('should close out one when asked to', (done) => {
    let selectedAlert;
    Alerts.findByUser(targetUserId)
    .then((alerts) => {
      // We assume one exists because we just made one in the preceding test
      selectedAlert = alerts[0];
      return Alerts.closeOne(selectedAlert.alert_id);
    }).then(() => Alerts.findByUser(targetUserId)).then((alerts) => {
      alerts.forEach((alert) => {
        alert.alert_id.should.not.be.exactly(selectedAlert.alert_id);
      });
      done();
    }).catch(done);
  });

  it('should send to all active users in a department', (done) => {
    const departmentId = 1;
    let users;
    Alerts.createForDepartment(departmentId, createdBy, subject, message)
    .then(() => Users.where({
      department: departmentId,
      active: true,
    })).then((resp) => {
      users = resp;
      return new Promise((fulfill, reject) => fulfill(resp));
    }).map(user => Alerts.findByUser(user.cmid)).then((listOfAlertsList) => {
      let alerts = [];
      listOfAlertsList.forEach((alertsList) => {
        alerts = alerts.concat(alertsList);
      });

      // We should have created and closed out all other alerts at this point
      alerts.length.should.be.exactly(users.length);
      done();
    }).catch(done);
  });

  it('should send to all active users in an org', (done) => {
    const organizationId = 1;
    let users;
    Alerts.createForOrganization(organizationId, createdBy, subject, message)
    .then(() => Users.where({ org: organizationId, active: true })).then((resp) => {
      users = resp;
      return new Promise((fulfill, reject) => fulfill(users));
    }).map(user => Alerts.findByUser(user.cmid)).then((listOfAlertsList) => {
      let alerts = [];
      listOfAlertsList.forEach((alertsList) => {
        alerts = alerts.concat(alertsList);
      });
      // Should be adding on the ones from the previous test,
      // since we have not closed all out
      alerts.length.should.be.greaterThan(users.length);
      done();
    }).catch(done);
  });

  // it('should send to all active user in an org', function(done) {

  // });
});
