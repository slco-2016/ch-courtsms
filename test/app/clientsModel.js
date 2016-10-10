const assert = require('assert');

const Clients = require('../../app/models/clients');
const CommConns = require('../../app/models/commConns');

require('colors');
const should = require('should');


let phoneId;
let phone = '12345678906';
describe('Clients checks', function() {

  it('Should be able to create client', function(done) {
    Clients.create(2, 'Joe', 'F', 'Someone', '1988-04-02', 12321, 1234567)
    .then((client) => {
      client.cm.should.be.exactly(2);
      client.first.should.be.exactly('Joe');
      done();
    }).catch(done);
  });

  it('clients should be able to be found by attribute type, single query', function(done) {
    Clients.findOneByAttribute("clid", 1, (baseDbCall) => {
      return baseDbCall.where("active", true);
    })
    .then((client) => {
      client.clid.should.be.exactly(1);
      done();
    }).catch(done)
  });

  it('with findOneByAttribute, should return null if none found', function(done) {
    Clients.findOneByAttribute("clid", 99999999, (baseDbCall) => {
      return baseDbCall.where("active", true);
    })
    .then((client) => {
      should(client).not.be.ok();
      done();
    }).catch(done)
  });

  it('clients should be able to be found by attribute type, multi query', function(done) {
    Clients.findManyByAttribute("cm", 2, (baseDbCall) => {
      return baseDbCall.where("active", true);
    })
    .then((clients) => {
      clients.length.should.be.greaterThan(0);
      done();
    }).catch(done)
  });

  it('with find by many attr multi query, array even if no results, just length 0', function(done) {
    Clients.findManyByAttribute("cm", 9999, (baseDbCall) => {
      return baseDbCall.where("active", true);
    })
    .then((clients) => {
      clients.length.should.be.exactly(0);
      done();
    }).catch(done)
  });

  it('Should be able to find clients by the commid created', function(done) {
    Clients.findByCommId(1)
    .then((clients) => {

      CommConns.findManyByAttribute("comm", 1, (dbCall) => {
        return dbCall
          .andWhere("retired", null);
      })
      .then((commConns) => {
        clients.length.should.be.exactly(commConns.length);
        done();
      }).catch(done);

    }).catch(done);
  });

  it('Should be able to update client from BaseModel method', function(done) {
    Clients.findById(1)
    .then((client) => {
      return client.update({first: 'joe'})
    }).then((client) => {
      should.equal(client.first, 'joe')
      done()
    }).catch(done)
  })
  
})