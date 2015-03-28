var path = require('path');

describe('Build Errors', function () {

  describe('Given the app does not build properly,', function () {

    // TODO: check if the process is properly killed

    this.timeout(20000);

    var message = "";

    var server = meteor({
      pathToApp   : path.resolve(__dirname, '..', 'build_error'),
      skipBuild   : false, // overwrite the default setting
      noAutoStart : true,
    });

    it('should throw an error', function () {
      return server
        .init()
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error should contain useful information', function () {
      expect(message).to.contain("Unexpected token :");
      expect(message).to.contain("build_error.js");
      expect(message).to.contain("3");
      expect(message).to.contain("35");
    });

  });

  describe('Given gagarin is not installed,', function () {

    // TODO: check if the process is properly killed

    this.timeout(20000);

    var message = "";

    var server = meteor({
      pathToApp   : path.resolve(__dirname, '..', 'no_gagarin'),
      noAutoStart : true,
    });

    it('should throw an error', function () {
      return server
        .init()
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error should contain useful information', function () {
      expect(message).to.match(/not installed/);
    });

  });

  describe('Given gagarin is in incompatible version,', function () {

    // TODO: check if the process is properly killed

    this.timeout(20000);

    var message = "";

    var server = meteor({
      pathToApp   : path.resolve(__dirname, '..', 'incompatible'),
      skipBuild   : false, // overwrite the default setting
      noAutoStart : true,
    });

    it('should throw an error', function () {
      return server
        .init()
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error should contain useful information', function () {
      expect(message).to.match(/(please update)|(not installed)/);
    });

  });

  describe('Given timeout for the first server output is exceeded', function(){
    var server = meteor({
      noAutoStart    : true,
      startupTimeout : 1,
    });

    it('should throw an error', function () {
      return server
      .init()
      .expectError(function (err) {
        message = err.message;
      });
    });

    it('the error should contain useful information', function () {
      expect(message).to.contain("server output");
    });

  });

  describe('Given timeout for server startup is exceeded', function(){
    var server = meteor({
      noAutoStart     : true,
      startupTimeout2 : 1,
    });

    it('should throw an error', function () {
      return server
      .init()
      .expectError(function (err) {
        message = err.message;
      });
    });

    it('the error should contain useful information', function () {
      expect(message).to.contain("server startup");
    });

  });

});
