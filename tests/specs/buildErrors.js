var path = require('path');
var fs = require('fs');

describe('Build Errors', function () {

  // NOTE: meteor no longer reports build error if there's
  //       a problem within source code itself ...
  //
  describe('Given the app does not build properly,', function () {

    // TODO: check if the process is properly killed

    this.timeout(120000);

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
    });

  });

  describe('Given timeout for the first server output is exceeded', function(){
    var message = "";
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
    var message = "";
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
