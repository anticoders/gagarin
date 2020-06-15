
var Promise = require('es6-promise').Promise;

describe('Benchmark test suite', function () {

  var server = meteor();

  it('execute should work', function () {
    return server.execute(function () {
      return Meteor.release;
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('db insert should work', function () {
    return server.execute(function () {
      return Items.insert({});
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('promise should work', function () {
    return server.promise(function (resolve, reject) {
      Meteor.setTimeout(function () {
        resolve(Meteor.release);
      }, 100);
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('should throw a descriptive error', function () {
    return server.execute(function () {
      undefined[0];
    }).expectError(function (err) {
      expect(err.toString()).to.contain('property');
    });
  });

  describe("Server benchmark", function () {
    this.timeout(10000);

    it('2000x execute', function () {
      var myPromise = server;
      var i;
      for (var i=0; i<2000; i++) {
        myPromise = myPromise.execute(function () {
          return Meteor.release;
        });
      }
      return myPromise;
    });
  });

  describe("Browser benchmark", function () {
    var client = browser(server);

    this.timeout(5000);

    it('500x execute', function () {
      var myPromise = client;
      var i;
      for (var i=0; i<500; i++) {
        myPromise = myPromise.execute(function () {
          return Meteor.release;
        });
      }
      return myPromise;
    });
  });

});
