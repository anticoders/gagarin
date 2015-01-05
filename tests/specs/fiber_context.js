describe('Fiber based context', function () {
  var fiberServer = meteor({fiber: true});
  var promiseServer = meteor();

  var fiberBrowser = browser({location: fiberServer.location, fiber: true});
  var promiseBrowser = browser(promiseServer.location);

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
});