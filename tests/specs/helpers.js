var Promise = require('es6-promise').Promise;

describe('Helpers', function () {

  describe('Built in helpers', function () {

    var server = meteor();
    var client = browser(server);

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

    it('waitForDOM should return true when dom object has been added', function () {
      return client
        .click('#waitForDOM')
        .waitForDOM('#waitForTestDiv')
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('waitUntilGone should return true when dom object has been removed', function () {
      return client
        .click('#waitUntilGone')
        .waitUntilGone('#removeChildTestDiv')
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('waitUntilNotVisible should return true when dom object is no longer visible', function () {
      return client
        .click('#waitUntilNotVisible')
        .waitUntilNotVisible('#waitUntilNotVisible')
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('getText should return innerHTML for a given selector', function () {
      return client
        .getText('#getText')
        .then(function(res) {
          expect(res).to.be.eql('<h3>Get text.</h3>');
        });
    });

    it('getValue should return the value for a given selector', function () {
      return client
        .getValue('#getValue')
        .then(function(res) {
          expect(res).to.be.eql('Get value.');
        });
    });

    it('getClass should return the classname for a given selector', function () {
      return client
        .getClass('#getClass')
        .then(function(res) {
          expect(res).to.be.eql('myClass');
        });
    });

    it('getClass should return empty string if selector has no class', function () {
      return client
        .getClass('#noClass')
        .then(function(res) {
          expect(res).to.be.eql('');
        });
    });

    it('setValue should set the value of an input', function () {
      return client
        .setValue('#setValue','test value')
        .getValue('#setValue')
        .then(function(res) {
          expect(res).to.be.eql('test value');
        });
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
