const assert = require('assert');

const BaseModel = require('../../app/lib/models').BaseModel

require('colors');
const should = require('should');


// http://mherman.org/blog/2016/04/28/test-driven-development-with-node/

class TestModel extends BaseModel {
  constructor(data) {
    super({
      data: data,
      columns: ["cmid","org"],
    })
  }
}

describe('BaseModel checks', function() {
  
  it('BaseModel should correctly assign props', function(done) {
    let testModel = new TestModel({cmid: 3, org: "org name"})
    testModel.cmid.should.be.exactly(3)
    testModel.org.should.be.exactly("org name")

    done();
  })

  it("BaseModel should be angry if we " +
    "don't have all the correct attributes", function(done) {
      
      should.not.exist(TestModel.tableName)
      should.not.exist(TestModel.primaryId)

      assert.throws(() => {TestModel.findByID()})

      TestModel.tableName = "foo"
      assert.throws(() => {TestModel.findByID()})

      TestModel.tableName = null
      TestModel.primaryId = "foo"
      assert.throws(() => {TestModel.findByID()})

      done()
  })

  it("BaseModel should clean parameters", function(done) {
    newParams = TestModel._cleanParams({org: 1, created: "nah"})
    should.deepEqual(newParams, {org: 1})
    done();
  })

  it("BaseModel getSingle response should handle edge cases", function(done) {
    let fulfill = (isNull) => {
      should.not.exist(isNull)
    }

    TestModel._getSingleResponse(undefined, fulfill, null)
    TestModel._getSingleResponse([], fulfill, null)
    done()
  })

  it("BaseModel getSingle response should" +
    "return valid instance", function(done) {

    let fulfill = (instance) => {
      instance.should.have.property('_info')
      instance.cmid.should.be.exactly(1)
    }
    TestModel._getSingleResponse([{cmid: 1, org: "Org Name"}], fulfill, null)
    done()
  })

})