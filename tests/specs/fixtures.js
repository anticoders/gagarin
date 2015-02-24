
describe.only('Fixtures', function () {

  describe('Unit tests with mocha', function () {

    var server = meteor();
    var client = browser(server);

    server.use('mocha');

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^superDuperTestSuite.js$/);

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/30.*\n.*this is a simulated error.*\n.*superDuperTestSuite.js:9:1/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/30.*\n.*this is a simulated error.*\n.*superDuperTestSuite.js:9:1/);
    });

  });

  describe('Unit tests for packages', function () {

    var server = meteor();
    var client = browser(server);

    server.use('mocha');

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^packages\/.+/);

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/we are expecting this error.*\n.*my-package.js:22:1/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/we are expecting this error.*\n.*my-package.js:22:1/);
    });

  });

  describe('Unit tests for individual files', function () {

    var server = meteor();
    var client = browser(server);

    server.use('mocha');

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^(client|server)\/.+/);

    it('should receive unit tests results from server', function () {
      return server.mocha().expectError(/this error was thrown on purpose.*\n.*serverSideOnly.js:11:1/);
    });

    it('should receive unit tests results from client', function () {
      return client.mocha().expectError(/this error was thrown on purpose.*\n.*clientSideOnly.js:11:1/);
    });

  });

});

