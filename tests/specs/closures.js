describe('Closures.', function () {

  var server = meteor();
  //var client = browser(server.location);

  var a = Math.random().toString();
  var b = Math.random().toString();
  var c = Math.random().toString();
  var d = Math.random().toString();

  closure(['a', 'b', 'c', 'd'], function (key, value) {
    return eval(key + (arguments.length > 1 ? '=' + JSON.stringify(value) : ''));
  });

  describe('Using closure in server tests', function () {

    it('should be able to access closure variable on server', function () {
      return server.execute(function () {
        return a;
      }).then(function (value) {
        expect(value).to.equal(a);
      });
    });

    it('should be able to alter closure variable on server', function () {
      return server.execute(function () {
        return a = Math.random().toString();
      }).then(function (value) {
        expect(a).to.equal(value);
      });
    });

  });

});
