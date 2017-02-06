const assert = require('assert');
const supertest = require('supertest');
const should = require('should');

const APP = require('../../app/app');

const Departments = require('../../app/models/departments');
const Users = require('../../app/models/users');

const owner = supertest.agent(APP);

const seededDeptName = 'Pretrial LKJKLJUnique';

describe('Alerts View', () => {
  // login as the owner account
  before((done) => {
    owner.post('/login')
      .type('form')
      .send({ email: 'owner@test.com' })
      .send({ pass: '123' })
      .expect(302)
      .expect('Location', '/')
      .end((err, res) => {
        done(err);
      });
  });
});
