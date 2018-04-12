const assert = require('assert');
const supertest = require('supertest');
const should = require('should');
const cheerio = require('cheerio');

const APP = require('../../app/app');

const Departments = require('../../app/models/departments');
const Users = require('../../app/models/users');

const owner = supertest.agent(APP);

const seededDeptName = 'Pretrial LKJKLJUnique';

describe('Departments View', () => {
  // login as the owner account
  before((done) => {
    owner.get('/login').end((err, res) => {
      if (res.status == '302') {
        done();
      } else {
        const $html = cheerio.load(res.text);
        const csrf = $html('input[name=_csrf]').val();

        owner.post('/login')
          .type('form')
          .send({ _csrf: csrf })
          .send({ email: 'owner@test.com' })
          .send({ pass: '123' })
          .expect(302)
          .expect('Location', '/login-success')
          .end((err, res) => {
            done(err);
          }); // end post login
      }
    }); // end get login
  }); // end before

  it('we should be able to view the departments index/listing and see departments that are in the org', (done) => {
    owner.get('/org/departments')
      .expect(200)
      .end((err, res) => {
        // make sure that the seeded department shows up on the page
        res.text.should.match(RegExp(seededDeptName));
        done(err);
      });
  });

  it('we should be able to view a single department\'s edit card', (done) => {
    // find the department with that unique name
    Departments.findOneByAttribute('name', seededDeptName)
    .then((department) => {
      owner.get(`/org/departments/${department.department_id}/edit`)
        .expect(200)
        .end((err, res) => {
          // make sure that the seeded department shows up on the page
          res.text.should.match(RegExp(seededDeptName));
          done(err);
        });
    }).catch(done);
  });

  it('we should be able to view a single department\'s edit card', (done) => {
    // ref variables for the test
    let department,
      users;

    // find the department with that unique name (same as before)
    Departments.findOneByAttribute('name', seededDeptName)
    .then((resp) => {
      department = resp;

      return Users.findManyByAttribute('department', department.department_id);
    }).then((resp) => {
      users = resp;

      owner.get(`/org/departments/${department.department_id}/supervisors`)
        .expect(200)
        .end((err, res) => {
          users.forEach((user) => {
            res.text.should.match(RegExp(`${user.last}(.*)${user.first}`));
          });
          done(err);
        });
    }).catch(done);
  });
});
