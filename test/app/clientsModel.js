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

  
})