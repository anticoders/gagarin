var Promise = require('es6-promise').Promise;
var Gagarin = require('../../gagarin');
var PhantomAsPromise = require('phantom-as-promise').PhantomAsPromise;
var path = require('path');
var expect = require('chai').expect;

describe('Tests with phantomjs browser', function () {

  var page = null;
  
  var phantom = new PhantomAsPromise({
    phantomPath: require('phantomjs').path
  }, require('phantom-as-promise').meteor_helpers);

  var gagarin = new Gagarin({
    pathToApp: path.resolve('./tests/example')
  });

  before(function () {
    // the sleep is not required but
    // lets demonstrate that it works :)
    return gagarin.start().sleep(500);
  });
  
  before(function () {
    page = phantom.page();
    return page.open(gagarin.location);
  });

  after(function () {
    return Promise.all([
      phantom.exit(),
      gagarin.exit(),
    ]);
  });

  it('should be ok', function () {
    return Promise.resolve('should be ok');
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

  describe('Restarting server', function () {

    var anotherPage = null;

    before(function () {
      anotherPage = phantom.page();
      return anotherPage.open(gagarin.location)
        .waitForMeteor();
    });

    before(function () {
      return gagarin.restart(2000);
    });

    it ('should be all right', function () {
      return gagarin.eval(function ()  {
        return Meteor.release;
      })
      .then(function (release) {
        expect(release).to.be.ok;
      });
    });

    it('should recognize that the server was restarted', function () {
      return anotherPage.wait(5000, 'until reset value changes', function () {
        return reset;
      })
      .then(function (numberOfResets) {
        expect(numberOfResets).to.equal(1);
      });
    });

    it ('another restart shoud work as well', function () {
      return gagarin.restart().eval(function ()  {
        return Meteor.release;
      })
      .then(function (release) {
        expect(release).to.be.ok;
      });
    });

  });

});
