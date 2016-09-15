


// DEPENDENCIES
var db = require("../app/db");
var assert = require("chai").assert;
var creds = require("../credentials");
var u = require("./utils");

// Makes sure that testing is functioning okay
// If this fails, then everything else is likely failing as well
describe("Array", function() {
  describe("#indexOf()", function () {
    it("Should return -1 when the value is not present", function () {
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});



// Load up Supertest package
var request = require("supertest");
setTimeout(runTests, 000);

// Work through the routes
// TO DO: Resolve issue of delay in superuser being created
function runTests () {
  describe("Boot up express.", function () {
    var server;
    
    // Start up the server each time (does this mean we have to login each time?)
    beforeEach(function () {
      server = require("../app/app");
    });
    
    // Drop all row values from the test table
    afterEach(function () {
      var deleteEverything = "TRUNCATE clients, cms, commconns, comms, convos, msgs, orgs;";
      db.raw(deleteEverything).then(function () {
        server.close();
      }).catch(function (err) { throw Error("afterEach failed during DB TRUNCATE: ", err)});
    });
    
    it("Index page", function (done) {
      request(server).get("/")
        .expect(302, done);
    });
    
    it("Login page", function (done) {
      request(server).get("/login")
        .expect(200, done);
    });

    it("Login as super user", function (done) {
      var req = request(server);
      u.superuserLogin(req, done);
    });

    it("Login as super user and create an org", function (done) {
      // Create server request object
      var req = request(server)
      // P1: First login as superuser
      u.superuserLogin(req, function () {
      // P2: POST a new organization
      u.createOrganization(req, done);

      }); // P1
    });

    it("Create a supervisor for an organization", function (done) {
      // Create server request object
      var req = request(server)
      // P1: First login as superuser
      u.superuserLogin(req, function () {
      // P2: POST a new organization
      u.createOrganization(req, function() {
      // P3: Create first supervisor for organization
      u.createSupervisor(req, done);
        
      }); // P2
      }); // P1
    });

    it("Successful session logout", function (done) {
      // Create server request object
      var req = request(server)
      // P1: First login as superuser
      u.superuserLogin(req, function () {
      // P2: Logout
      u.logout(req, done);

      }); // P1
    });

    it("Login as test user", function (done) {
      // Create server request object
      var req = request(server)

      // P1: First login as superuser
      u.superuserLogin(req, function () {
      // P2: POST a new organization
      u.createOrganization(req, function() {
      // P3: Create first supervisor for organization
      u.createSupervisor(req, function () {
      // P4: Logout
      u.logout(req, function () {
      // P5: Login as the new user
      u.testuserLogin(req, done);

      }); // P4
      }); // P3
      }); // P2
      }); // P1
    });
    
    it("Be rerouted to splash page when already logged in", function (done) {
      request(server).post("/login")
        .field("email", "jim@foo.com")
        .field("pass", "123")
        .expect(302, done);
    });
    
    it("All unknown paths 404", function (done) {
      request(server).get("/foo/bar")
        .expect(404, done);
    });

  });
};


