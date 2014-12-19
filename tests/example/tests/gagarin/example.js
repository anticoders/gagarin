
describe('An example Gagarin test suite', function () {

  var server = meteor(function () {
    // probably the best place for your fixtures
  });

  var client = browser(server.location + "/path/to/some/view", function () {
    // some initialization on client (if needed)
  });

  it('should just work', function () {
    return client.execute(function () {
      // some code to execute
    }).then(function () {
      server.execute(function () {
        // some code to execute on server
      });
    });
  });

  it("should be able to do work asynchronously", function () {
    return server.promise(function (resolve) {
      setTimeout(function () {
        resolve(1234);
      }, 1000);
    }).then(function (value) {
      expect(value).to.equal(1234);
    });
  });

});
