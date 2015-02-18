
describe('Fixtures', function () {

  describe('Basic code injection', function () {

    var server = meteor();

    server.addJavaScript('client', function () {

    });

    server.addJavaScript('server', function () {
      
    });

  });

  describe.only('Unit tests with mocha', function () {

    var server = meteor({ mocha: true });
    var client = browser(server);

    server.addJavaScript('server', function () {

      describe('Super duper server test suite', function () {

        var i = 0;

        for (i = 0; i < 30; i++) {
          (function (i) {
            it('should just work ' + i, function (done) { setTimeout(done, 2 * i); });
            it('should throw an error', function (done) {
              setTimeout(function () {
                done(new Error('this is a simulated error'));
              }, 2 * i);
            });
          })(i);
        }

      });    

    });

    server.addJavaScript('client', function () {

      describe('Super duper client test suite', function () {

        it('should just work', function () {

        });

        it('should throw an error', function () {
          throw new Error('this is a simulated error');
        });

      });    

    });

    it('should receive unit tests results from server', function () {
      return server.runMocha().expectError(/30.*\n.*this is a simulated error/);
    });

    it('should receive unit tests results from client', function () {
      return client.runMocha();
    });

  });

  describe('Unit tests for package', function () {

    var server = meteor({ mocha: true });
    var client = browser(server);

    server.addJavaScript('server', { toPackage: 'my-package' }, function () {

      describe('Super duper server test suite', function () {

        it('should just work', function () {

        });

        it('should throw an error', function () {
          throw new Error('this is a simulated error');
        });

      });    

    });

    server.addJavaScript('client', { toPackage: 'my-package' }, function () {

      describe('Super duper client test suite', function () {

        it('should just work', function () {

        });

        it('should throw an error', function () {
          throw new Error('this is a simulated error');
        });

      });    

    });

    it('should receive unit tests results from server', function () {
      return server.runMocha();
    });

    it('should receive unit tests results from client', function () {
      return client.runMocha();
    });

  });

});
