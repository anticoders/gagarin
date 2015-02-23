
describe('Fixtures', function () {

  describe.skip('Basic code injection', function () {

    var server = meteor();

    server.addJavaScript('client', function () {

    });

    server.addJavaScript('server', function () {
      
    });

  });

  describe('Unit tests with mocha', function () {

    var server = meteor({ mocha: true });
    var client = browser(server);

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^superDuperTestSuite.js$/);

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/30.*\n.*this is a simulated error.*\n.*superDuperTestSuite.js:9:1/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/30.*\n.*this is a simulated error.*\n.*superDuperTestSuite.js:9:1/);
    });

  });

  describe.only('Unit tests for package', function () {

    var server = meteor({ mocha: true });
    var client = browser(server);

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^packages\/.+/);

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/we are expecting this error.*\n.*my-package.js:22:1/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/we are expecting this error.*\n.*my-package.js:22:1/);
    });

  });

});

