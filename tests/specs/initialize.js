
describe('Initialization', function () {

  var server = meteor(function () {
    Items.insert({_id: 'server'});
  });

  var client = browser(server, function (resolve, reject) {
    Items.insert({_id: 'client'}, either(reject).or(resolve));
  });

  it('initialization should work on server', function () {
    return server.execute(function () {
      return Items.findOne({_id: 'server'});
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('initialization should work on client', function () {
    return server.execute(function () {
      return Items.findOne({_id: 'client'});
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  describe('Manual initialization', function () {

    var server2 = meteor({ noAutoStart: true });

    describe('Given the server is not initialized', function () {

      it('should throw an error if the user attepmts to do something', function () {
        return server2.expectError(function (err) {
          expect(err.message).to.contain('initialized');
        });
      });

    });

    describe('Given the server is initialized', function () {

      before(function () {
        server2.init();
      });

      it('should not throw errors anymore', function () {
        return server2;
      });

      it('should not throw error if no argument is passed to meteor.startup', function () {
        return server2.startup();
      });

      it('should throw error if wrong argument is passed to meteor.startup', function () {
        return server2.startup("thisIsNotAFucntion").expectError(function (err) {
          expect(err.message).to.contain("function");
        });
      });

      it('should be able to run a startup function', function () {
        return server2.startup(function () {
          return Meteor.release;
        }).then(function (value) {
          expect(value).to.be.ok;
        });
      });

    });

  });


});
