var Promise = require('es6-promise').Promise;

describe('Helpers', function () {

  describe('Built in helpers', function () {

    var server = meteor();
    var client = browser(server.location);

    it('should be able to use sendKeys', function () {
      return client
        .sendKeys('input[type=text]', 'abc')
        .expectValueToEqual('input[type=text]', 'abc');
    });

    it('should be able to use click', function () {
      return client
        .click('input[type=button]')
        .expectTextToContain('p', '1');
    });

  });

  describe('Custom user-defined helpers', function () {

    var server = meteor({
      helpers: {
        sleepForOneSecond: function () {
          return this.then(function () {
            return new Promise(function (resolve) {
              setTimeout(resolve, 1000);
            });
          });
        },
      },
    });

    it('should be able to use a custom helper', function () {
      return server.sleepForOneSecond();
    });

  });

});
