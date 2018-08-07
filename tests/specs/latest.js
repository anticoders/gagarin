
var path = require('path');
var fs = require('fs');

describe('Build latest', function () {

  describe('Given gagarin runs in latest meteor,', function () {

    this.timeout(120000);

    var pathToApp = path.resolve(__dirname, '..', 'latest');
    var message   = "";

    var server = meteor({
      pathToApp   : pathToApp,
      skipBuild   : false,
      noAutoStart : true,
    });

    it('should not throw an error', function () {
      return server
        .init()
        .then(function () {});
    });

  });

});

