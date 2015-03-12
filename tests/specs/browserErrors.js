
describe('Browser Errors', function () {

  var message = "";
  var server = meteor();
  var client = browser(server);

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

