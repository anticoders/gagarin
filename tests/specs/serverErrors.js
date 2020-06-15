

describe('Server Errors', function () {

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
      expect(message).to.contain('Unexpected token');
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
      expect(message).to.contain('Unexpected token');
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
      expect(message).to.contain('Unexpected token');
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
        .wait(100, 'until error is thrown', function () {
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

});

