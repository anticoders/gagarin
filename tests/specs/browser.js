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
      
  var id = Math.floor(1000 * Math.random());

  it('db insert should work in browser', function () {
    return page.eval(function (id) {
      return Items.insert({vostok: id});
    }, id)
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });
  
  it('the same element should be present on server', function () {
    return gagarin.eval(function (id) {
      // TODO: wait?
      return Items.findOne({vostok: id});
    }, id)
    .then(function (item) {
      expect(item).to.be.ok;
    });
  });

});
