/* global describe context it before */
const supertest = require('supertest');

const APP = require('../../app/app');
const should = require('should');
const anonymous = supertest.agent(APP);

describe('root controller', () => {
  describe('GET /', () => {
    it('renders a login link', (done) => {
      anonymous.get('/')
        .expect(200)
        .end((err, res) => {
          res.text.should.match(/Login/)
          done(err);
        });
      });
  });
});
