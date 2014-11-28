var expect = require('chai').expect;

describe('Gagarin methods', function () {

  var server = meteor();
  var client = browser(server.location);

  it('should be able to execute code on the server', function () {
    return server.execute(function () {
      return Meteor.release;
    }).then(function (value) {
      expect(value).to.be.ok;
    });
  });

  it('should be able to execute code on the client', function () {
    return client.execute(function () {
      return Meteor.release;
    }, []).then(function (value) {
      expect(value).to.be.ok;
    });
  });

  it('should be able to call promise on the server', function () {
    return server.promise(function (resolve) {
      setTimeout(resolve, 100);
    });
  });

  it('should be able to call promise on the client', function () {
    return client
      .setAsyncScriptTimeout(500)
      .promise(function (resolve) {
        setTimeout(resolve, 100);
      }, []);
  });

  it('should be able to wait on server', function () {

    server.execute(function () {
      setTimeout(function () {
        Meteor.someRandomProperty = Math.random();
      }, 500)
    }, []);

    return server
      .wait(1000, 'until something happens', function () {
        return !!Meteor.someRandomProperty;
      }, []);

  });


  it('should be able to wait on client', function () {

    client.execute(function () {
      setTimeout(function () {
        Meteor.someRandomProperty = Math.random();
      }, 500)
    }, []);

    return client
      .wait(1000, 'until something happens', function () {
        return !!Meteor.someRandomProperty;
      }, []);

  });

});