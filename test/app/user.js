const assert = require('assert');
const session = require('supertest-session');

const APP = require('../../server/app')

request = session(APP)

// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

before(function(done) {
  console.log("Running test/app/user.js".green)
  done();
})

describe('Basic http req tests', function() {

  it('should redirect from root', function(done) {
    request.get('/')
      .expect(302)
      .expect('Location', '/login')
      .end(function(err, res) {
        done(err);
      });
  })

  it('should be able to view login page', function(done) {
    request.get('/login')
      .expect(200)
      .end(function(err, res) {
        done(err);
      });
  })

  it('should redirect from root', function(done) {
    request.post('/login')
      .field('email', 'af@sadf')
      .field('pass', 'pass')
      .expect(302)
      .expect('Location', '/login-fail')
      .end(function(err, res) {
        done(err);
      });
  })

  it('should login with real creds', function(done) {
    request.post('/login')
      .type('form')
      .send({'email':'owner@test.com'})
      .send({'pass':'123'})
      .expect(302)
      .expect('Location', '/')
      .end(function(err, res) {
        done(err);
      });
  })

  it('logged in owner user should redirect to org', function(done) {
    request.get('/')
      .expect(302)
      .expect('Location', '/org')
      .end(function(err, res) {
        done(err);
      });
  })

})


// describe('Basic http req tests', function() {

//   it('root', function(done) {

//     var res = buildResponse()
//     var req  = http_mocks.createRequest({
//       method: 'GET',
//       url: '/',
//     })

//     res.on('end', function() {
//       res.statusCode.should.equal(302);
//       done()
//     })

//     APP.handle(req, res)
//   })

// })