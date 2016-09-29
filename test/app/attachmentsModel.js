const assert = require('assert');
const request = require('request');

const Attachments = require('../../app/models/attachments')

require('colors');
const should = require('should');

describe('Attachment checks', function() {
  let a;

  it('Should be able to create attachment', function(done) {
    let key = "whatever";
    Attachments.create({key: key})
    .then((attachment) => {
      a = attachment
      attachment.key.should.be.exactly(key);
      should.exist(attachment.id)
      done();
    }).catch(done);
  });

  it('Should be able to create temporary url', function(done) {
    url = a.getUrl()
    should.exist(url)
    done();
    // removing this for now
    // need to pass some s3 creds to travis for this to work
    // request.get(url).on('response', (resp) => {
    //   // 404 should be ok here?
    //   // auth error codes is what we're worried about
    //   resp.statusCode.should.be.exactly(404)
    //   done();
    // })
    
  })

})