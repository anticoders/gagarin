
var Promise = require('es6-promise').Promise;
var expect = require('chai').expect;
var path = require('path');

describe('Tests with browser', function () {

  var server = meteor({});

  var browser1 = browser(server.location);
  
  it('should be ok', function () {
    return Promise.resolve('should be ok');
  });

  it('execute should work in browser', function () {
    return browser1.execute(function (value) {
        return value;
      }, [ 'someValue' ])
      .then(function (value) {
        expect(value).to.equal('someValue');
      });
  });

  // TODO: we should implement more tests for custom helpers
  it('should be able to use standard helpers', function () {
    return browser1.getText('h1').then(function (value) {
      expect(value).to.contain('Hello World!');
    });
  });

  var id = Math.floor(1000 * Math.random()).toString();

  describe('Database insertions', function () {
    before(function () {
      return browser1
        .promise(function (resolve, reject, id) {
          Items.insert({_id: id}, either(reject).or(resolve));
        }, [ id ])
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

    this.timeout(10000);

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
        .wait(5000, 'until reset event is detected', "return reset > 0")
        .execute("return reset;")
        .then(function (numberOfResets) {
          expect(numberOfResets).to.equal(1);
        });
    });

    it ('another restart shoud work as well', function () {
      return server.restart().then(function () {
        return browser2
          .wait(5000, 'until reset event is detected', "return reset > 1")
          .execute("return reset;")
          .then(function (numberOfResets) {
            expect(numberOfResets).to.equal(2);
          });
      });
    });

  });

});
