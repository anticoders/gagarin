
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

    it('even if the script throws in server.execute', function () {

      return server.execute(function () {
        this.someContextVariable = 4.5;
        throw new Error('fake error');
      }).catch(function () {
        expect(this.someContextVariable).to.equal(4.5);
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

    it('even if the script throws in server.promise', function () {

      return server.promise(function () {
        this.someContextVariable = 5.5;
        throw new Error('fake error');
      }).catch(function () {
        expect(this.someContextVariable).to.equal(5.5);
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

    it('even if the script fails in server.wait', function () {

      return server.wait(100, 'until anything', function () {
        this.someContextVariable = 6.5;
        throw new Error('fake error');
      }).catch(function () {
        expect(this.someContextVariable).to.equal(6.5);
      });

    });

  });

  describe('Passing context to the client code', function () {

    var client = browser(server);

    it('should be able to access context variable in client.execute', function () {

      return client.then(function () {
        this.someContextVariable = 1;
      }).execute(function () {
        return this.someContextVariable;
      }).then(function (value) {
        expect(value).to.equal(1);
      });

    });

    it('should be able to access context variable in client.promise', function () {

      return client.then(function () {
        this.someContextVariable = 2;
      }).promise(function (resolve) {
        resolve(this.someContextVariable);
      }).then(function (value) {
        expect(value).to.equal(2);
      });

    });

    it('should be able to access context variable in client.wait', function () {

      return client.then(function () {
        this.someContextVariable = 3;
      }).wait(100, 'until value equals 3', function () {
        return this.someContextVariable === 3;
      });

    });

    it('should be able to alter context variable in client.execute', function () {

      return client.execute(function () {
        this.someContextVariable = 4;
      }).then(function () {
        expect(this.someContextVariable).to.equal(4);
      });

    });


    it('even if the script thorws in client.execute', function () {

      return client.execute(function () {
        this.someContextVariable = 4.5;
        throw new Error('fake error');
      }).catch(function () {
        expect(this.someContextVariable).to.equal(4.5);
      });

    });

    it('should be able to access context variable in client.promise', function () {

      return client.promise(function (resolve) {
        this.someContextVariable = 5;
        resolve();
      }).then(function () {
        expect(this.someContextVariable).to.equal(5);
      });

    });

    it('even if the script throws in client.promise', function () {

      return client.promise(function () {
        this.someContextVariable = 5.5;
        throw new Error('fake error');
      }).catch(function () {
        expect(this.someContextVariable).to.equal(5.5);
      });

    });

    it('should be able to access context variable in client.wait', function () {

      return client.wait(100, 'until anything', function () {
        this.someContextVariable = 6;
        return true;
      }).then(function () {
        expect(this.someContextVariable).to.equal(6);
      });

    });

    it('even if the script throws in client.wait', function () {

      return client.wait(100, 'until anything', function () {
        this.someContextVariable = 6.5;
        throw new Error('fake error');
      }).catch(function () {
        expect(this.someContextVariable).to.equal(6.5);
      });

    });

    describe('Persistance in promise chains', function () {

      it('should persist in promise chains', function () {
        return server.then(function () {
          this.someContextVariable = 1;
        }).then(function () {
          expect(this.someContextVariable).to.equal(1);
        }).then(function () {
          throw new Error('fake error');
        }).expectError(function (err) {
          expect(err.message).to.match(/fake error/);
          expect(this.someContextVariable).to.equal(1);
        });
      });

      it('should survive noWait calls', function () {
        var promise = server.then(function () {
          this.anotherContextVariable = 2;
        });
        return promise.noWait().then(function () {
          expect(this.anotherContextVariable).to.equal(2);
        });
      });

      it('should survive branch calls', function () {
        var promise = server.then(function () {
          this.anotherContextVariable = 3;
        });
        return promise.branch().then(function () {
          expect(this.anotherContextVariable).to.equal(3);
        });
      });

      it('should not be shared accross different promise chains', function () {
        return server.then(function () {
          this.yetAnotherVariable = 10;
          return server.then(function () {
            expect(this.yetAnotherVariable).to.be.undefined;
          });
        });
      });

      it('unless there is an explicit request to do so', function () {
        var context = {};
        return server.branch(context).then(function () {
          this.yetAnotherVariable = 10;
          return server.branch(context).then(function () {
            expect(this.yetAnotherVariable).to.equal(10);
          });
        });
      });

      it('should persist accross switchTo calls', function () {
        return server.then(function () {
          this.mySharedVariable = 1234;
        }).switchTo(client).then(function () {
          expect(this.mySharedVariable).to.equal(1234);
        });
      });

    });

  });

});
