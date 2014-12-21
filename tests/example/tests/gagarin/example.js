
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

});
