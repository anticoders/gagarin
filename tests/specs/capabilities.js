describe('Browser capabilities', function () {

  var server = meteor();

  var client1 = browser({
    location: server,
    dontWaitForMeteor: true,
    windowSize: { width: 500, height: 500 },
  });

  var client2 = browser({
    dontWaitForMeteor: false,
    location: server,
    capabilities: {
      browserName: 'chrome',
      chromeOptions: {
        mobileEmulation: {
          deviceName: 'Apple iPhone 5'
        }
      }
    }
  });

  it('should be able to resize window', function () {
    return client1.execute(function () {
      return [ window.outerWidth, window.outerHeight ];
    })
    .then(function (size) {
      expect(size).to.eql([ 500, 500 ]);
    });
  });

  it('should be able to emulate mobile device', function () {
    return client2.execute(function () {
      return Meteor.Device.isPhone();
    })
    .then(function (isPhone) {
      expect(isPhone).to.be.true;
    });
  });

});
