var expect = require('chai').expect;

describe('Gagarin methods', function () {

  var server = meteor();

  describe('Server', function () {

    it('should be able to execute code on the server', function () {
      return server.execute(function () {
        return Meteor.release;
      }).then(function (value) {
        expect(value).to.be.ok;
      });
    });

    it('should be able to pass arguments to server execute', function () {
      return server.execute(function (a, b) {
        return a * b;
      }, [ 2, 3 ]).then(function (value) {
        expect(value).to.equal(6);
      });
    });

    it('should be able to call promise on the server', function () {
      return server.promise(function (resolve) {
        setTimeout(resolve, 100);
      });
    });

    it('should be able to pass arguments to server promise', function () {
      return server
        .promise(function (resolve, reject, a, b) {
          setTimeout(function () { resolve(a * b); }, 100);
        }, [ 3, 5 ])
        .then(function (value) {
          expect(value).to.equal(15);
        })
    });

    it('multiple calls to resolve should not break anything', function () {
      return server.promise(function (resolve) {
        resolve(1);
        resolve(2);
      }).then(function (value) {
        expect(value).to.equal(1);
      });
    });

    it('multiple calls to reject should not break anything', function () {
      return server.promise(function (resolve, reject) {
        reject(new Error("1"));
        reject(new Error("2"));
      }).expectError("1");
    });

    it('should be able to wait on server', function () {
      server.execute(function () {
        setTimeout(function () {
          Meteor.someRandomProperty = Math.random();
        }, 500)
      }, []);
      return server
        .wait(4000, 'until something happens', function () {
          return !!Meteor.someRandomProperty;
        }, []);
    });

    it('should be able to pass arguments to wait on server', function () {
      return server.execute(function () {
          setTimeout(function () {
            Meteor.someRandomProperty2 = Math.random();
          }, 500)
        })
        .wait(2000, 'until something happens', function (a, b) {
          return !!Meteor.someRandomProperty2 && a * b;
        }, [3, 7])
        .then(function (value) {
          expect(value).to.equal(21);
        });
    });

  });

  describe('Client', function () {

    var client = browser(server);

    it('should be able to execute code on the client', function () {
      return client.execute(function () {
        return Meteor.release;
      }).then(function (value) {
        expect(value).to.be.ok;
      });
    });

    it('should be able to pass arguments to client execute', function () {
      return client.execute(function (a, b) {
        return a * b;
      }, [ 2, 3 ]).then(function (value) {
        expect(value).to.equal(6);
      });
    });

    it('should be able to call promise on the client', function () {
      return client
        .promise(function (resolve) {
          setTimeout(resolve, 100);
        });
    });

    it('should be able to pass arguments to client promise', function () {
      return client
        .promise(function (resolve, reject, a, b) {
          setTimeout(function () { resolve(a * b); }, 100);
        }, [ 3, 5 ])
        .then(function (value) {
          expect(value).to.equal(15);
        })
    });

    it('should be able to wait on client', function () {
      return client.execute(function () {
          setTimeout(function () {
            Meteor.someRandomProperty = Math.random();
          }, 500)
        })
        .wait(2000, 'until something happens', function () {
          return !!Meteor.someRandomProperty;
        });
    });

    it('should be able to pass awrguments to wait on client', function () {
      return client.execute(function () {
          setTimeout(function () {
            Meteor.someRandomProperty2 = Math.random();
          }, 500)
        })
        .wait(2000, 'until something happens', function (a, b) {
          return !!Meteor.someRandomProperty2 && a * b;
        }, [3, 7])
        .then(function (value) {
          expect(value).to.equal(21);
        });
    });

  });

});