
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

    // by default it goes to both client and server
    server.useFixture('superDuperTestSuite.js');

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/30.*\n.*this is a simulated error.*\n.*superDuperTestSuite.js:9:1/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/30.*\n.*this is a simulated error.*\n.*superDuperTestSuite.js:9:1/);
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

