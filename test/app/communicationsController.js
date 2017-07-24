const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const cheerio = require('cheerio');

const APP = require('../../app/app');

const Communications = require('../../app/models/communications');
const CommConns = require('../../app/models/commConns');

const primary = supertest.agent(APP);
const twilioRecordingRequest = require('../data/twilioVoiceRecording.js');

const uniquePhoneNumber = '12342342345';
const uniquePhoneNumberName = 'unique phone number 1';

describe('Voice requirements', () => {
  before((done) => {
    primary.get('/login').end(function(err, res) {
      if (res.status == '302') {
        done();
      } else {
        const $html = cheerio.load(res.text);
        const csrf_login = $html('input[name=_csrf]').val();

        primary.post('/login')
          .send({ _csrf: csrf_login })
          .send({ email: 'primary@test.com' })
          .send({ pass: '123' })
          .expect(302)
          .expect('Location', '/login-success')
          .then(() => {
            // should be able to create a phone number cell type communication
            primary.get('/clients/2/communications/create').end(function(err, res) {
              const $html = cheerio.load(res.text);
              const csrf_create = $html('input[name=_csrf]').val();

              primary.post('/clients/2/communications/create')
                .send({ _csrf: csrf_create })
                .send({
                  description: uniquePhoneNumberName,
                  type: 'cell',
                  value: uniquePhoneNumber,
                })
                .expect(302)
                .then(() => {
                  Communications.findOneByAttribute('value', uniquePhoneNumber)
                  .then((communication) => {
                    should.equal(communication.type, 'cell');
                    should.equal(communication.description, uniquePhoneNumberName);
                    done();
                  }).catch(done);
                }); // end post create
            }); // end get create
          }); // end post login
      }
    }); // end get login
  });

  it('should be able to create email type communication', (done) => {
    primary.get('/clients/2/communications/create').end(function(err, res) {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/clients/2/communications/create')
        .send({ _csrf: csrf })
        .send({
          description: 'email comm',
          type: 'email',
          value: 'test@test.com',
        })
        .expect(302)
        .end((err, res) => {
          Communications.findOneByAttribute('value', 'test@test.com')
          .then((communication) => {
            should.equal(communication.type, 'email');
            should.equal(communication.description, 'email comm');
            done();
          }).catch(done);
        }); // end post create
      }); // end get create
    });

  it('should be able to create a phone number cell type communication', (done) => {
    primary.get('/clients/2/communications/create').end(function(err, res) {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/clients/2/communications/create')
        .send({ _csrf: csrf })
        .send({
          description: 'random number',
          type: 'cell',
          value: '18288384838',
        })
        .expect(302)
        .end((err, res) => {
          Communications.findOneByAttribute('value', '18288384838')
          .then((communication) => {
            should.equal(communication.type, 'cell');
            should.equal(communication.description, 'random number');
            done();
          }).catch(done);
        }); // end post create
    }); // end get create
  });

  it('modifying an existing current phone number', (done) => {
    const newNameForContact = 'unique phone number 1 modified';
    primary.get('/clients/2/communications/create').end(function(err, res) {
      const $html = cheerio.load(res.text);
      const csrf = $html('input[name=_csrf]').val();
      primary.post('/clients/2/communications/create')
        .send({ _csrf: csrf })
        .send({
          description: newNameForContact,
          type: 'cell',
          value: uniquePhoneNumber,
        })
        .expect(302)
        .end((err, res) => {
          Communications.findOneByAttribute('value', uniquePhoneNumber)
          .then((communication) => {
            should.equal(communication.type, 'cell');
            should.equal(communication.description, uniquePhoneNumberName);

            return CommConns.findManyByAttribute('comm', communication.commid);
          }).then((commconns) => {
            // it should have replaced and updated previous commconn
            should.equal(commconns.length, 1);
            should.equal(commconns[0].name, newNameForContact);
            done();
          }).catch(done);
        }); // end post create
    });
  });
});
