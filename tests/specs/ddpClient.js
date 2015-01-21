
describe('DDP client.', function () {

  var server = meteor();
  var client = ddp(server, {
    helpers: {
      example: function () {
        return this.call('example', []);
      }
    }
  });

  describe('Calling API methods.', function () {

    describe('Example method,', function () {

      var release = null;

      before(function () {
        return server.execute(function () {
          return Meteor.release;
        })
        .then(function (value) {
          release = value;
        });
      });

      it('should be able to call "example" method', function () {
        return client.call('example', [ 'someArgumentsMayGoHere' ]).then(function (value) {
          expect(value).to.equal(release);
        });
      });

      it('should be able to call "example" method using helpers', function () {
        return client.example().then(function (value) {
          expect(value).to.equal(release);
        });
      });

      it('should not be able to call "private" method', function () {
        return client.call("private", []).expectError(function (err) {
          expect(err.message).to.contain('403');
        });
      });

    });

    describe('Authentication,', function () {

      var release = null;

      before(function () {
        return server.execute(function () {
          return Accounts.createUser({ username: 'test', password: 'password' });
        });
      });

      it('should be able to login', function () {
        return client.login({ user : { username : "test" }, password : "password" });
      });

      it('should be able to call private method', function () {
        return client.call('private', []);
      });

      it('should be able to logout', function () {
        return client.logout();
      });

      it('should no longer be able to call "private" method', function () {
        return client.call("private", []).expectError(function (err) {
          expect(err.message).to.contain('403');
        });
      });

    });

  });

});
