

// DEPENDENCIES
const db = require('../app/db');
const assert = require('chai').assert;
const creds = require('../credentials');
const u = require('./utils');

// Makes sure that testing is functioning okay
// If this fails, then everything else is likely failing as well
describe('Array', () => {
  describe('#indexOf()', () => {
    it('Should return -1 when the value is not present', () => {
      assert.equal(-1, [1, 2, 3,].indexOf(5));
      assert.equal(-1, [1, 2, 3,].indexOf(0));
    });
  });
});


// Load up Supertest package
const request = require('supertest');
setTimeout(runTests, 4000);

// Work through the routes
// TO DO: Resolve issue of delay in superuser being created
function runTests() {
  describe('Boot up express.', () => {
    let server;

    // Start up the server each time (does this mean we have to login each time?)
    beforeEach(() => {
      server = require('../app/app');
    });

    // Drop all row values from the test table
    afterEach(() => {
      const deleteEverything = 'TRUNCATE clients, cms, commconns, comms, convos, msgs, orgs;';
      db.raw(deleteEverything).then(() => {
        server.close();
      }).catch((err) => { throw Error('afterEach failed during DB TRUNCATE: ', err); });
    });

    it('Index page', (done) => {
      request(server).get('/')
        .expect(302, done);
    });

    it('Login page', (done) => {
      request(server).get('/login')
        .expect(200, done);
    });

    it('Login as super user', (done) => {
      const req = request(server);
      u.superuserLogin(req, done);
    });

    it('Login as super user and create an org', (done) => {
      // Create server request object
      const req = request(server);
      // P1: First login as superuser
      u.superuserLogin(req, () => {
      // P2: POST a new organization
        u.createOrganization(req, done);
      }); // P1
    });

    it('Create a supervisor for an organization', (done) => {
      // Create server request object
      const req = request(server);
      // P1: First login as superuser
      u.superuserLogin(req, () => {
      // P2: POST a new organization
        u.createOrganization(req, () => {
      // P3: Create first supervisor for organization
          u.createSupervisor(req, done);
        }); // P2
      }); // P1
    });

    it('Successful session logout', (done) => {
      // Create server request object
      const req = request(server);
      // P1: First login as superuser
      u.superuserLogin(req, () => {
      // P2: Logout
        u.logout(req, done);
      }); // P1
    });

    it('Login as test user', (done) => {
      // Create server request object
      const req = request(server);

      // P1: First login as superuser
      u.superuserLogin(req, () => {
      // P2: POST a new organization
        u.createOrganization(req, () => {
      // P3: Create first supervisor for organization
          u.createSupervisor(req, () => {
      // P4: Logout
            u.logout(req, () => {
      // P5: Login as the new user
              u.testuserLogin(req, done);
            }); // P4
          }); // P3
        }); // P2
      }); // P1
    });

    it('Be rerouted to splash page when already logged in', (done) => {
      request(server).post('/login')
        .field('email', 'jim@foo.com')
        .field('pass', '123')
        .expect(302, done);
    });

    it('All unknown paths 404', (done) => {
      request(server).get('/foo/bar')
        .expect(404, done);
    });
  });
}

