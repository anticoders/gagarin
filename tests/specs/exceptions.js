var expect = require('chai').expect;
var Meteor = require('../../lib/meteor');
var path   = require('path');

describe('Reporting Exceptions', function () {

  describe('Given the app does not built properly,', function () {

    // TODO: check if the process is properly killed

    this.timeout(20000);

    var message = "";

    var server = new Meteor({
      pathToApp: path.resolve(__dirname, '..', 'build_error')
    });

    it('should throw an error', function () {
      return server
        .start()
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error should contain useful information', function () {
      expect(message).to.contain("Unexpected token :");
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

      it('should respawn the meteor process when requested', function () {
        return server1
          .restart()
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
      var client = browser(server2.location);

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
