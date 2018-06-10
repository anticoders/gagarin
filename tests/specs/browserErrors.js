
describe('Browser Errors', function () {

  var server = meteor();
  var client = browser(server);

  describe('Not strict', function () {

    this.timeout(20000);

    it('should allow introducing new global variables in client.execute', function () {
      return client.execute(function(){
        someNewVariable = true;
      }).execute(function(){
        expect(someNewVariable).to.be.true
      })
    });

    it('should allow introducing new global variables in client.promise', function () {
      return client.promise(function (resolve, reject) {
        someOtherVariable = true;
        resolve();
      }).execute(function(){
        expect(someOtherVariable).to.be.true
      });
    });

    it('should allow introducing new global variables in client.wait', function () {
      return client.wait(1000, 'should wait for a global variable', function () {
        someFooVariable = true;
        return someFooVariable;
      }).execute(function(){
        expect(someFooVariable).to.be.true
      });
    });
    xit('should allow introducing new global variables in client.wait without requiring global prefix', function () {
    });

  });

  describe('If there is a syntax error in client-side injected script', function () {

    var message = '';

    it('should be properly reported', function () {
      return client
        .execute("function () { : }")
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error message should contain useful information', function () {
      expect(message).to.contain('Unexpected token');
    });

  });

  describe('If there is a syntax error in client-side promise', function () {

    var message = '';

    it('should be properly reported', function () {
      return client
        .promise("function () { : }")
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error message should contain useful information', function () {
      expect(message).to.contain('Unexpected token');
    });

  });

  describe('If there is a syntax error in client-side wait', function () {

    var message = '';

    it('should be properly reported', function () {
      return client
        .wait(1000, "until syntax error is thrown", "function () { : }")
        .expectError(function (err) {
          message = err.message;
        });
    });

    it('the error message should contain useful information', function () {
      expect(message).to.contain('Unexpected token');
    });

  });

  describe('If the client-side injected script throws an error', function () {

    var message = '';

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

    var message = '';

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

    var message = '';

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

    var message = '';

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

