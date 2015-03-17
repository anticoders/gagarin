
describe('Context.', function () {

  var server = meteor();

  describe('Passing context to the server code', function () {

    it('should be able to access context variable in server.execute', function () {

      return server.then(function () {
        this.someContextVariable = 1;
      }).execute(function () {
        return this.someContextVariable;
      }).then(function (value) {
        expect(value).to.equal(1);
      });

    });

    it('should be able to access context variable in server.promise', function () {

      return server.then(function () {
        this.someContextVariable = 2;
      }).promise(function (resolve) {
        resolve(this.someContextVariable);
      }).then(function (value) {
        expect(value).to.equal(2);
      });

    });

    it('should be able to access context variable in server.wait', function () {

      return server.then(function () {
        this.someContextVariable = 3;
      }).wait(100, 'until value equals 3', function () {
        return this.someContextVariable === 3;
      });

    });

    it('should be able to alter context variable in server.execute', function () {

      return server.execute(function () {
        this.someContextVariable = 4;
      }).then(function () {
        expect(this.someContextVariable).to.equal(4);
      });

    });

    it('should be able to access context variable in server.promise', function () {

      return server.promise(function (resolve) {
        this.someContextVariable = 5;
        resolve();
      }).then(function () {
        expect(this.someContextVariable).to.equal(5);
      });

    });

    it('should be able to access context variable in server.wait', function () {

      return server.wait(100, 'until anything', function () {
        this.someContextVariable = 6;
        return true;
      }).then(function () {
        expect(this.someContextVariable).to.equal(6);
      });

    });

  });

});
