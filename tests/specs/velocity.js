var path = require('path');

describe('Velocity integration.', function () {

  this.timeout(20000);

  var server = meteor({ pathToApp: path.resolve(__dirname, '..', 'velocity'), skipBuild: false });
  var client = ddp(server);

  it('should be able to register gagarin framework', function () {
    return client
      .call('velocity/register/framework', [ 'gagarin' ]);
  });

  it('should be able to reset gagarin reports', function () {
    return client
      .call('velocity/reports/reset', [ { framework: 'gagarin' } ]);
  });

});
