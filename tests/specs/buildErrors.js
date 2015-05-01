var path = require('path');
var fs = require('fs');

describe('Build Errors', function () {

  // it does not work without pty.js
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
      expect(message).to.contain('meteor build exited with code');
      //expect(message).to.contain("Unexpected token :");
      //expect(message).to.contain("build_error.js");
      //expect(message).to.contain("3");
      //expect(message).to.contain("35");
    });

  });

  describe('Given gagarin is not installed,', function () {

    // TODO: check if the process is properly killed

    this.timeout(20000);

    var pathToApp = path.resolve(__dirname, '..', 'no_gagarin');
    var message   = "";

    var server = meteor({
      pathToApp   : pathToApp,
      skipBuild   : false,
      noAutoStart : true,
    });

    after(function (done) {
      var pathToMeteorPackages = path.join(pathToApp, '.meteor', 'packages');
      replaceFileContent(pathToMeteorPackages, function (content) {
        return content.replace(/anti:gagarin@=.*\n/, "");
      }, done);
    });

    after(function (done) {
      var pathToMeteorVersions = path.join(pathToApp, '.meteor', 'versions');
      replaceFileContent(pathToMeteorVersions, function (content) {
        return content.replace(/anti:gagarin@.*\n/, "");
      }, done);
    });

    it('should not throw an error', function () {
      return server
        .init()
        .then(function () {});
    });

    // it('the error should contain useful information', function () {
    //  expect(message).to.match(/not installed/);
    // });

  });

  describe('Given gagarin is in incompatible version,', function () {

    // TODO: check if the process is properly killed

    this.timeout(20000);

    var pathToApp = path.resolve(__dirname, '..', 'incompatible');
    var message   = "";

    var server = meteor({
      pathToApp   : pathToApp,
      skipBuild   : false, // overwrite the default setting
      noAutoStart : true,
    });

    after(function (done) {
      var pathToMeteorPackages = path.join(pathToApp, '.meteor', 'packages');
      replaceFileContent(pathToMeteorPackages, function (content) {
        return content.replace(/anti:gagarin@=.*/, "anti:gagarin@=0.3.0");
      }, done);
    });

    after(function (done) {
      var pathToMeteorVersions = path.join(pathToApp, '.meteor', 'versions');
      replaceFileContent(pathToMeteorVersions, function (content) {
        return content.replace(/anti:gagarin@.*/, "anti:gagarin@0.3.0");
      }, done);
    });

    it('should not throw an error', function () {
      return server
        .init()
        .then(function () {});
    });

    // it('the error should contain useful information', function () {
    //   expect(message).to.match(/(please update)|(not installed)/);
    // });

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


function replaceFileContent (pathToFile, transform, done) {
  fs.readFile(pathToFile, { encoding: 'utf8' }, function (err, content) {
    if (err) {
      return done(err);
    }
    content = transform(content);
    //-------------------------------------------------
    fs.writeFile(pathToFile, content, function (err) {
      if (err) {
        return done(err);
      }
      done();
    });
  });
}
