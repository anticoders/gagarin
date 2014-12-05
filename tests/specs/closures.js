describe('Closures.', function () {

  var server = meteor();
  //var client = browser(server.location);

  var a = Math.random();
  var b = Math.random();
  var c = Math.random();
  var d = Math.random();

  closure(['a', 'b', 'c', 'd'], function (key, value) {
    return eval(key + (arguments.length > 1 ? '=' + JSON.stringify(value) : ''));
  });

  describe('Closure variables in server scripts', function () {

    describe('When using server.execute', function () {

      it('should be able to access a closure variable', function () {
        return server.execute(function () {
          return a;
        }).then(function (value) {
          expect(value).to.equal(a);
        });
      });

      it('should be able to alter a closure variable', function () {
        return server.execute(function () {
          return a = Math.random();
        }).then(function (value) {
          expect(a).to.equal(value);
        });
      });

      it('should be able to update closure with sync routine', function () {
        return server.execute(function () {
          var value = Math.random();
          $sync({ a: value });
          return value;
        }).then(function (value) {
          expect(a).to.equal(value);
        });
      });

      it('should be able to update closure asynchronously with sync routine', function () {
        return server.execute(function () {
          var value = Math.random();
          Meteor.setTimeout(function () {
            $sync({ a: value });
          });
          return value;
        }).then(function (value) {
          return wait(1000, 'until value is updated', function () {
            return a === value;
          });
        });
      });

    });

    describe('When using server.promise', function () {

      it('should be able to access a closure variable', function () {
        return server.promise(function (resolve) {
          setTimeout(function () {
            resolve(b);
          }, 100);
        }).then(function (value) {
          expect(value).to.equal(b);
        });
      });

      it('should be able to alter a closure variable', function () {
        return server.promise(function (resolve) {
          setTimeout(function () {
            resolve(b = Math.random());
          }, 100);
        }).then(function (value) {
          expect(value).to.equal(b);
        });
      });

      it('even if the promise is rejected', function () {
        return server.promise(function (resolve, reject) {
          setTimeout(function () {
            reject(b = Math.random());
          }, 100);
        }).catch(function (err) {
          expect(err.toString()).to.contain(b);
        });
      });

    });

    describe('When using server.wait', function () {

      before(function () {
        c = 10;
      });

      it('should be able to access a closure variable', function () {
        return server.wait(1000, 'until c equals 10', function () {
          return c == 10;
        });
      });

      it('should be able to alter a closure variable', function () {
        return server.wait(1000, 'until a is negative', function () {
          return (c -= 1) < 0;
        }).then(function () {
          expect(c).to.be.negative;
        });
      });

      it('should be able to use asynchronous closure update', function () {
        var interval = setInterval(function () { c -= 0.1 }, 10);
        return server.wait(1000, 'until c is negative', function () {
          return $sync() && c < 0;
        }).then(function () {
          clearInterval(interval);
        });
      });

    });

  });

});
