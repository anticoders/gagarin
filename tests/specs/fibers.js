describe('Fibers', function () {

  var server = meteor();

  describe('When using server.execute', function () {

    it('should be able to access the current Fiber', function () {
      return server.execute(function () {
        return !!Fiber.current;
      }).then(function (value) {
        expect(value).to.be.true;
      });
    });

    it('should be able to use to current fiber to wait', function () {
      return server.execute(function () {
        var fiber = Fiber.current;
        setTimeout(function () {
          fiber.run('returned from fiber');
        }, 100);
        return Fiber.yield();
      }).then(function (value) {
        expect(value).to.equal('returned from fiber');
      });
    });

  });

  describe('When using server.promise', function () {

    it('should be able to access the current Fiber', function () {
      return server.execute(function () {
        return !!Fiber.current;
      }).then(function (value) {
        expect(value).to.be.true;
      });
    });

    it('should be able to use to current fiber to wait', function () {
      return server.promise(function (resolve) {
        var fiber = Fiber.current;
        setTimeout(function () {
          fiber.run('returned from fiber');
        }, 100);
        resolve(Fiber.yield());
      }).then(function (value) {
        expect(value).to.equal('returned from fiber');
      });
    });

  });

  describe('When using server.wait', function () {

    it('should be able to access the current Fiber', function () {
      return server.wait(1000, 'until Fiber.current is defined', function () {
        return !!Fiber.current;
      }).then(function (value) {
        expect(value).to.be.true;
      });
    });

    it('should be able to use to current fiber to wait', function () {
      return server.wait(1000, 'until Fiber returns', function (resolve) {
        var fiber = Fiber.current;
        setTimeout(function () {
          fiber.run('returned from fiber');
        }, 100);
        return Fiber.yield();
      }).then(function (value) {
        expect(value).to.equal('returned from fiber');
      });
    });

  });

});
