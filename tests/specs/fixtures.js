
var silent = true;

describe('Fixtures', function () {

  describe('Unit tests with mocha', function () {

    var suite  = this;
    var server = meteor();
    var client = browser(server);

    server.use('mocha');

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^superDuperTestSuite.js$/);
    
    it('should receive unit tests results from server', function () {
      return server.mocha(suite, { silent: silent }).expectError(function (err) {
        expect(err.message).to.contain("this is a simulated error");
        expect(err.stack).to.contain("superDuperTestSuite.js:12:1");
      });
    });
    
    it('should receive unit tests results from client', function () {
      return client.mocha(suite, { silent: silent }).expectError(function (err) {
        expect(err.message).to.contain("this is a simulated error");
        expect(err.stack).to.contain("superDuperTestSuite.js:12:1");
      });
    });

  });

  describe('Unit tests for packages', function () {

    var suite  = this;
    var server = meteor();
    var client = browser(server);

    server.use('mocha');

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^packages\/.+/);

    it('should receive unit tests results from server', function () {
      return server.mocha(suite, { silent: silent }).expectError(function (err) {
        expect(err.message).to.contain("we are expecting this error");
        expect(err.stack).to.contain("my-package.js:22:1");
      });
    });
    
    it('should receive unit tests results from client', function () {
      return client.mocha(suite, { silent: silent }).expectError(function (err) {
        expect(err.message).to.contain("we are expecting this error");
        expect(err.stack).to.contain("my-package.js:22:1");
      });
    });

  });

  describe('Unit tests for individual files', function () {

    var suite  = this;
    var server = meteor();
    var client = browser(server);

    server.use('mocha');

    // by default it goes to both client and server
    server.useFixtures([ __dirname, '..', 'fixtures' ], /^(client|server)\/.+/);

    it('should receive unit tests results from server', function () {
      return server.mocha(suite, { silent: silent }).expectError(function (err) {
        expect(err.message).to.contain("this error was thrown on purpose");
        expect(err.stack).to.contain("serverSideOnly.js:11:1");
      });
    });
    
    it('should receive unit tests results from client', function () {
      return client.mocha(suite, { silent: silent }).expectError(function (err) {
        expect(err.message).to.contain("this error was thrown on purpose");
        expect(err.stack).to.contain("clientSideOnly.js:11:1");
      });
    });

  });

});
