
describe('Fixtures', function () {

  describe('Basic code injection', function () {

    var server = meteor();

    server.addJavaScript('client', function () {

    });

    server.addJavaScript('server', function () {
      
    });

  });

  describe.only('Unit tests with mocha', function () {

    var server = meteor({ mocha: true });
    var client = browser(server);

    server.addJavaScript('server', { atLineNumber: 85 }, superDuperTestSuite);
    server.addJavaScript('client', { atLineNumber: 85 }, superDuperTestSuite);

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/30.*\n.*this is a simulated error/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/30.*\n.*this is a simulated error/);
    });

  });

  describe('Unit tests for package', function () {

    var server = meteor({ mocha: true });
    var client = browser(server);

    server.addJavaScript('server', { toPackage: 'my-package' }, function () {

      describe('Super duper server test suite', function () {

        it('should just work', function () {

        });

        it('should throw an error', function () {
          throw new Error('this is a simulated error');
        });

      });    

    });

    server.addJavaScript('client', { toPackage: 'my-package' }, function () {

      describe('Super duper client test suite', function () {

        it('should just work', function () {

        });

        it('should throw an error', function () {
          throw new Error('this is a simulated error');
        });

      });    

    });

    it('should receive unit tests results from server', function () {
      return server.mocha();
    });

    it('should receive unit tests results from client', function () {
      return client.mocha();
    });

  });

});

function superDuperTestSuite() {
  describe('Super duper test suite', function () {
    var i = 0;
    for (i = 0; i < 30; i++) {
      (function (i) {
        it('should just work ' + i, function () { });
        it('should throw an error', function () {
          throw new Error('this is a simulated error');
        });
      })(i);
    }
  });      
}
