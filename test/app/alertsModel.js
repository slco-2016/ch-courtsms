const assert = require('assert');
const request = require('request');

const Alerts = require('../../app/models/alerts')

require('colors');
const should = require('should');

describe('Alert model actions checks', function() {

  it('Query should work regardless of whether or not there are alerts for user', function(done) {
    let key = "whatever";
    Alerts.findByUser(1)
    .then((alerts) => {
      console.log(alerts);
      done();
    }).catch(done);
  });

})