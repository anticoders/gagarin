var Promise = require('es6-promise').Promise;
var Gagarin = require('../../gagarin');
var PhantomAsPromise = require('phantom-as-promise').PhantomAsPromise;
var path = require('path');
var expect = require('chai').expect;

describe('Tests with phantomjs browser', function () {

  var page = null;
  
  var phantom = new PhantomAsPromise({
    phantomPath: require('phantomjs').path
  });

  var gagarin = new Gagarin({
    pathToApp: path.resolve('./tests/example')
  });

  before(function () {
    // the sleep is not required but
    // lets demonstrate that it works :)
    return gagarin.sleep(500);
  });
  
  before(function () {
    page = phantom.page();
    return page.open(gagarin.location);
  });

  after(function () {
    return Promise.all([
      phantom.exit(),
      gagarin.kill(),
    ]);
  });

  it('eval should work in browser', function () {
    return page.eval(function () {
      return Meteor.release;
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });
      
  var id = Math.floor(1000 * Math.random()).toString();

  describe('Database insertions', function () {
    before(function () {
      return page.promise(function (resolve, reject, id) {
        Items.insert({_id: id}, either(reject).or(resolve));
      }, id)
      .then(function (value) {
        expect(value).to.equal(id);
      });
    });

    it('db insert should work in browser', function () {
      return page.eval(function (id) {
        return Items.findOne({_id: id});
      }, id)
      .then(function (value) {
        expect(value).not.to.be.empty;
        expect(value._id).to.equal(id);
      });
    });
    
    it('the same element should be present on server', function () {
      return gagarin.eval(function (id) {
        // TODO: wait?
        return Items.findOne({_id: id});
      }, id)
      .then(function (value) {
        expect(value).not.to.be.empty;
        expect(value._id).to.equal(id);
      });
    });

  });

});
