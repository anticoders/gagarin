describe('Flavor', function () {
  var fiberServer = meteor({flavor: "fiber"});
  var promiseServer = meteor({flavor: "promise"});

  var fiberBrowser = browser({location: fiberServer, flavor: "fiber"});
  var promiseBrowser = browser({location: promiseServer, flavor: "promise"});

  it('run inside a fiber', function () {
    expect(!!Fiber.current).to.be.equal(true);
  });

  describe('for meteor', function() {
    it('with sync api', function () {
      // return a promise
      var value = fiberServer.execute(function () {
        return 10 + 20;
      });

      expect(value).to.be.equal(30);
    });

    it('still supports promise api', function () {
      // return a promise
      return promiseServer.execute(function () {
        return 10 + 20;
      }).then(function(value) {
        expect(value).to.be.equal(30);
      })
    });

    it('still supports promise api with done', function (done) {
      // return a promise
      promiseServer.execute(function () {
        return 10 + 20;
      }).then(function(value) {
        throw new Error("this should be thrown")
      }).catch(function(error) {
        done();
      });
    });
  });

  describe('for browser', function() {
    it('with sync api', function () {
      // return a promise
      var value = fiberBrowser.execute(function () {
        return 10 + 20;
      });

      expect(value).to.be.equal(30);
    });

    it('still supports promise api', function () {
      // return a promise
      return promiseBrowser.execute(function () {
        return 10 + 20;
      }).then(function(value) {
        expect(value).to.be.equal(30);
      })
    });

    it('still supports promise api with done', function (done) {
      // return a promise
      promiseBrowser.execute(function () {
        return 10 + 20;
      }).then(function(value) {
        throw new Error("this should be thrown")
      }).catch(function(error) {
        done();
      });
    });
  })

  describe('sync api inside helpers', function() {
    var beforeK = 0;
    describe('before', function() {
      before(function() {
        beforeK = fiberServer.execute(function() {
          return 12;
        });
      });

      it('should get the value set by before', function() {
        expect(beforeK).to.be.equal(12);
      });
    });

    describe('beforeEach', function() {
      var beforeY = 0;
      beforeEach(function() {
        beforeY = fiberServer.execute(function(beforeY) {
          return beforeY + 10;
        }, [ beforeY ]);
      });

      it('should get the value incremented by beforeEach', function() {
        expect(beforeY).to.be.equal(10);
      });

      it('should again get the value incremented by beforeEach', function() {
        expect(beforeY).to.be.equal(20);
      });
    });

    describe('afterEach', function() {
      var beforeA = 0;
      afterEach(function() {
        beforeA = fiberServer.execute(function(beforeA) {
          return beforeA + 10;
        }, [ beforeA ]);
      });

      it('should not get the value set by afterEach', function() {
        expect(beforeA).to.be.equal(0);
      });

      it('should get the value set by afterEach', function() {
        expect(beforeA).to.be.equal(10);
      });

      it('should again get the value set by afterEach', function() {
        expect(beforeA).to.be.equal(20);
      });
    });

    describe('after', function() {
      beforeB = 0;
      after(function() {
        beforeB = fiberServer.execute(function(beforeB) {
          return beforeB + 10;
        }, [ beforeB ]);
      });

      it('should not get the value set by after', function() {
        expect(beforeB).to.be.equal(0);
      });

      it('still should not get the value set by after', function() {
        expect(beforeB).to.be.equal(0);
      });
    });

    describe('checking previous after', function() {
      it('should get the value set by previous after', function() {
        expect(beforeB).to.be.equal(10);
      });
    });
  });
});