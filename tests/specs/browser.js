var Promise = require('es6-promise').Promise;
var Gagarin = require('../../lib/gagarin');
var path = require('path');
var expect = require('chai').expect;
var wd = require('wd');

describe('Tests with phantomjs browser', function () {

  var browser1 = wd.promiseChainRemote('http://localhost:9515');
  var browser2 = wd.promiseChainRemote('http://localhost:9515');

  var gagarin = new Gagarin({
    pathToApp: path.resolve('./tests/example')
  });

  before(function () {
    // the sleep is not required but
    // lets demonstrate that it works :)
    return gagarin.start().sleep(500);
  });
  
  before(function () {
    return browser1
      .init()
      .get(gagarin.location);
  });

  after(function () {
    return Promise.all([
      browser1.close().quit(),
      browser2.close().quit(),
      gagarin.exit(),
    ]);
  });

  it('should be ok', function () {
    return Promise.resolve('should be ok');
  });

  it('execute should work in browser', function () {
    return browser1.execute("return Meteor.release;")
      .then(function (value) {
        expect(value).not.to.be.empty;
      });
  });
      
  var id = Math.floor(1000 * Math.random()).toString();

  describe('Database insertions', function () {
    before(function () {
      return browser1
        .setAsyncScriptTimeout(1000)
        .executeAsync(
          "var cb = arguments[arguments.length-1];\n" +
          "Items.insert({_id: " + JSON.stringify(id) + "}, function (err, res) { cb(res) });"
        )
        .then(function (value) {
          expect(value).to.equal(id);
        });
    });

    it('db insert should work in browser', function () {
      return browser1.execute(
          "return Items.findOne({_id: " + JSON.stringify(id) + "});"
        )
        .then(function (value) {
          expect(value).not.to.be.empty;
          expect(value._id).to.equal(id);
        });
    });
    
    it('the same element should be present on server', function () {
      return gagarin.execute(function (id) {
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

    before(function () {
      return browser2.init().setAsyncScriptTimeout(10000).get(gagarin.location);
    });

    before(function () {
      return gagarin.restart(2000);
    });

    it ('should be all right', function () {
      return gagarin.execute(function ()  {
          return Meteor.release;
        })
        .then(function (release) {
          expect(release).to.be.ok;
        });
    });

    it('should recognize that the server was restarted', function () {
      return browser2
        .waitForConditionInBrowser("reset > 0", 5000)
        .execute("return reset;")
        .then(function (numberOfResets) {
          expect(numberOfResets).to.equal(1);
        });
    });

    it ('another restart shoud work as well', function () {
      return gagarin.restart().execute(function ()  {
          return Meteor.release;
        })
        .then(function (release) {
          expect(release).to.be.ok;
        });
    });

  });

});
