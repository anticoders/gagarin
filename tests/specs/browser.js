
var Promise = require('es6-promise').Promise;
var expect = require('chai').expect;
var path = require('path');

describe('Tests with phantomjs browser', function () {

  var server = meteor({});

  var browser1 = browser(server.location);
  
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
      return server.execute(function (id) {
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

    var browser2 = browser(server.location);

    before(function () {
      return browser2.setAsyncScriptTimeout(10000);
    });

    before(function () {
      return server.restart(2000);
    });

    it ('should be all right', function () {
      return server.execute(function ()  {
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
      return server.restart().execute(function ()  {
          return Meteor.release;
        })
        .then(function (release) {
          expect(release).to.be.ok;
        });
    });

  });

});
