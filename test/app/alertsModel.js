const assert = require('assert');
const request = require('request');

const Alerts = require('../../app/models/alerts')

require('colors');
const should = require('should');

<<<<<<< HEAD
// Base information
let createdBy = 1,
    targetUserId = 2,
    subject = "Please remember",
    message = "Please remember to work more on the things that are imporant";
describe('Attachment checks', function() {
  let a;

  it('should return an array, always of all alerts', function(done) {
    Alerts.findByUser(1)
    .then((alerts) => {
      alerts.length.should.be.greaterThan(-1);
      done();
    }).catch(done);
  });

  it('creating one for user should resulted in that being populated in the db', function(done) {
    Alerts.createForUser(targetUserId, createdBy, subject, message)
    .then(() => {
      return Alerts.findByUser(targetUserId)
    }).then((alerts) => {
      alerts.length.should.be.exactly(1);
      let alert = alerts[0];
      alert.user.should.be.exactly(targetUserId);
      console.log("Alertsxx", alert.created_by, createdBy)
      alert.created_by.should.be.exactly(createdBy);
      alert.subject.should.be.exactly(subject);
      alert.message.should.be.exactly(message);
      alert.open.should.be.exactly(true);
      done();
    }).catch(done);
  });

  it('should close out one when asked to', function(done) {
    let selectedAlert;
    Alerts.findByUser(targetUserId)
    .then((alerts) => {
      // We assume one exists because we just made one in the preceding test
      selectedAlert = alerts[0];
      return Alerts.closeOne(selectedAlert.alert_id)
    }).then(() => {
      return Alerts.findByUser(targetUserId)
    }).then((alerts) => {
      alerts.forEach((alert) => {
        alert.alert_id.should.not.be.exactly(selectedAlert.alert_id);
      });
      done();
    }).catch(done);
  });

})