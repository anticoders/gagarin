var expect = require('chai').expect;
var Meteor = require('../../lib/meteor');
var path   = require('path');

describe('Reporting Exceptions', function () {

  describe('Using expectError helper', function () {

    var server = meteor();

    it('should throw error if wrong parameter is used', function () {
      expect(function () {
        server.expectError(123);
      }).throw(/must be/);
    });

    it('should throw an error if no error is thrown', function () {
      return server.expectError().then(function () {
        throw new Error('error was not thrown');
      }, function (err) {
        expect(err.message).to.contain('was not thrown');
      });
    });

    it('should throw if wrong type of object is thrown', function () {
      return server.then(function () {
        throw "this is not a valid error";
      }).expectError().then(function () {
        throw new Error('error was not thorwn');
      }, function (err) {
        expect(err.message).to.contain('instance of Error');
      });
    });

    it('may be used with no arguments', function () {
      return server.then(function () {
        throw new Error('just a fake error');
      }).expectError();
    });

    it('may be used with string as an argument', function () {
      return server.then(function () {
        throw new Error('just a fake error');
      }).expectError('just a fake error');
    });

    it('should throw if the string is not contained in err.message', function () {
      return server.then(function () {
        throw new Error('just a fake error');
      }).expectError('thisTextIsNotContainedInErrorMessage').then(function () {
        throw new Error('error was not thrown');
      }, function (err) {
        expect(err.message).to.contain('to include');
      });
    });

    it('may be used with RegExp as an argument', function () {
      return server.then(function () {
        throw new Error('just a fake error');
      }).expectError(/error$/);
    });

    it('should throw if the RegExp does not match err.message', function () {
      return server.then(function () {
        throw new Error('just a fake error');
      }).expectError(/^error/).then(function () {
        throw new Error('error was not thrown');
      }, function (err) {
        expect(err.message).to.contain('to match');
      });
    });

  });

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
      expect(message).to.contain("anti:gagarin");
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
      expect(message).to.contain("please update");
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
  
  describe('Given the app is properly built,', function () {

    // SERVER SIDE ERRORS

    var message = "";

    var server1 = meteor();
    var server2 = meteor();

    describe('If the app throws an uncought error', function () {

      before(function () {
        return server1.execute(function () {
          setTimeout(function () {
            throw new Error('this is a simulated error');
          }, 100);
        });
      })

      it('should report the error properly', function (done) {
        setTimeout(function () {
          server1.execute(function () {
            return Meteor.release;
          })
          .expectError(function (err) {
            expect(err.message).to.contain('simulated error');
          })
          .always(done);
        }, 500);
      });

      it('should respawn the meteor process automatically', function () {
        return server1
          .execute(function () {
            return Meteor.release;
          })
          .then(function (value) {
            expect(value).to.be.ok;
          });
      });

    });

    describe('If there is a syntax error in server-side injected script', function () {

      it('should be properly reported', function () {
        return server2
          .execute("function () { : }")
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('Unexpected token :');
      });

    });

    describe('If there is a syntax error in server-side promise', function () {

      it('should be properly reported', function () {
        return server2
          .promise("function () { : }")
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('Unexpected token :');
      });

    });

    describe('If there is a syntax error in server-side wait', function () {

      it('should be properly reported', function () {
        return server2
          .wait(1000, "until syntax error is thrown", "function () { : }")
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('Unexpected token :');
      });

    });

    describe('If the server-side injected script throws an error', function () {

      it('should be properly reported', function () {
        return server2
          .execute(function () {
            throw new Error('this is a fake error');
          })
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('this is a fake error');
      });

    });

    describe('If the server-side promise is rejected', function () {

      it('should be properly reported', function () {
        return server2
          .promise(function (resolve, reject) {
            reject(new Error('this is a fake error'));
          })
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('this is a fake error');
      });

    });


    describe('If the server-side promise fails due to some error', function () {

      it('should be properly reported', function () {
        return server2
          .promise(function () {
            throw new Error('this is a fake error');
          })
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('this is a fake error');
      });

    });

    describe('If the server-side wait fails due to some error', function () {

      it('should be properly reported', function () {
        return server2
          .wait(1000, 'until error is thrown', function () {
            throw new Error('this is a fake error');
          })
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('this is a fake error');
      });

    });

    describe('If the server-side wait fails due to timeout', function () {

      it('should be properly reported', function () {
        return server2
          .wait(100, 'until error is thrown', function () {
            // nothing here ...
          })
          .expectError(function (err) {
            message = err.message;
          });
      });

      it('the error message should contain useful information', function () {
        expect(message).to.contain('until error is thrown');
        expect(message).to.contain('but it did not happen');
      });

    });

    // CLIENT SIDE ERRORS

    describe('Client-side exceptions', function () {

      var message = "";
      var client = browser(server2);

      describe('Use strict', function () {

        it('should not allow introducing new global variables in client.execute', function () {
          return client.execute(function () {
            someNewVariable = true;
          }).expectError(function (err) {
            expect(err.message).to.include('someNewVariable');
          });
        });

        it('should not allow introducing new global variables in client.promise', function () {
          return client.promise(function (resolve) {
            resolve(someNewVariable = true);
          }).expectError(function (err) {
            expect(err.message).to.include('someNewVariable');
          });
        });

        it('should not allow introducing new global variables in client.wait', function () {
          return client.wait(1000, '', function () {
            return someNewVariable = true;
          }).expectError(function (err) {
            expect(err.message).to.include('someNewVariable');
          });
        });

      });

      describe('If there is a syntax error in client-side injected script', function () {

        it('should be properly reported', function () {
          return client
            .execute("function () { : }")
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('Unexpected token :');
        });

      });

      describe.skip('If chai assertion fails in client-side injected script', function () {

        it('should be properly reported', function () {
          return client
            .execute(function () {
              expect(true).to.be.false;
            })
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('expected true to be false');
        });

      });

      describe('If there is a syntax error in client-side promise', function () {

        it('should be properly reported', function () {
          return client
            .promise("function () { : }")
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('Unexpected token :');
        });

      });

      describe('If there is a syntax error in client-side wait', function () {

        it('should be properly reported', function () {
          return client
            .wait(1000, "until syntax error is thrown", "function () { : }")
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('Unexpected token :');
        });

      });

      describe('If the client-side injected script throws an error', function () {

        it('should be properly reported', function () {
          return client
            .execute(function () {
              throw new Error('this is a fake error');
            })
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('this is a fake error');
        });

      });

      describe('If the client-side promise is rejected', function () {


        it('should be properly reported', function () {
          return client
            .promise(function (resolve, reject) {
              reject(new Error('this is a fake error'));
            })
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('this is a fake error');
        });

      });

      describe('If the client-side wait fails due to some error', function () {

        it('should be properly reported', function () {
          return client
            .wait(1000, 'until error is thrown', function () {
              throw new Error('this is a fake error');
            })
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('this is a fake error');
        });

      });

      describe('If the client-side wait fails due to timeout', function () {

        it('should be properly reported', function () {
          return client
            .wait(100, 'until error is thrown', function () {
              // nothing here ...
            })
            .expectError(function (err) {
              message = err.message;
            });
        });

        it('the error message should contain useful information', function () {
          expect(message).to.contain('until error is thrown');
          expect(message).to.contain('but it did not happen');
        });

      });
    });

  });

});
