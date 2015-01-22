
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

      it('should report meaningful error if "call" is used with wrong parameters', function () {
        expect(function () {
          client.call('example', 1);
        }).to.throw(/array/);
      });

      it('should be able to call "example" method', function () {
        return client.call('example', [ 'someArgumentsMayGoHere' ]).then(function (value) {
          expect(value).to.equal(release);
        });
      });

      it('the "example" helper should be on the methods list', function () {
        expect(client.methods).to.contain('example');
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

    describe('Subscriptions.', function () {

      it('should report meaningful error if "subscribe" is used with wrong parameters', function () {
        expect(function () {
          client.subscribe('', 1);
        }).to.throw(/array/);
      });

      it('should report meaningful error if subscription does not exist', function () {
        return client
          .subscribe('thisShouldNotExist', [])
          .expectError(function (err) {
            expect(err.message).to.contain(404);
          });
      });

      describe('Given the client does not subscribe,', function () {

        var client2 = ddp(server);

        it('the data should not arrive', function () {
          return client2
            .call('create')
            .waitForUpdates('items')
            .then(function (listOfItems) {
              expect(listOfItems).to.be.undefined;
            });
        });

      });

      describe('Given the client does subscribe,', function () {

        var client3 = ddp(server);
        var id      = null;

        before(function () {
          return client3
            .subscribe('items').then(function (myId) {
              expect(myId).to.be.ok;
              id = myId;
            })
            .call('create', [ 'some test item' ]);
        });

        // XXX this test case often fails because data arrives too quickly
        //     we don't want that ... (think about a workaround)
        //
        //it('the data may not arrive immediately ...', function () {
        //  return client3
        //    .call('create', [ 'some test item' ])
        //    .collection('items')
        //    .then(function (listOfItems) {
        //      expect(values(listOfItems)).not.to.contain.a.thing.with.property('name', 'some test item');
        //    });
        //});

        it('the data should eventually arrive', function () {
          return client3
            .waitForUpdates('items')
            .then(function (listOfItems) {
              expect(values(listOfItems)).contain.a.thing.with.property('name', 'some test item');
            });
        });

        describe('When the client unsubscribes,', function () {
          before(function () {
            return client3.unsubscribe(id);
          });

          it('the data should be gone', function () {
            return client3
            .sleep(500)
            .collection('items').then(function (listOfItems) {
              expect(listOfItems).to.be.empty;
            });
          });
        });

      });

      describe('Given the client subscribes to a restricted data set,', function () {

        it('should not be granted access', function () {
          return client
            .subscribe('denied')
            .expectError(function (err) {
              expect(err.message).to.contain(403);
            });
        });

      });

    });

  });

  function values (object) {
    return Object.keys(object).map(function (key) { return object[key]; });
  }

});

