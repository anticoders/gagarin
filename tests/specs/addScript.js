describe('Add script helper', function () {

  var server = meteor();
  var client = browser(server);

  it('should be able to use addScript helper', function () {
    return client
      .execute(function () {
        return document.location.origin;
      })
      .then(function (location) {
        return client.addScript(location + '/test.js', function () {
          return !!window.thisPropertyIsAddedByTestJS;
        });
      });
  });

});
