var path = require('path');

describe.skip('Velocity integration.', function () {

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

  it('should be able to report that a test has passed', function () {
    return client
      .call('velocity/reports/submit', [ {
        name      : 'A super duper test.',
        framework : 'gagarin',
        result    : 'passed',
        id        : "1",
        ancestors : [],
        timestamp : new Date(),
        duration  : 10, // in milliseconds
      } ]);
  });

  it('should be able to report that a test has failed', function () {
    return client
      .call('velocity/reports/submit', [ {
        name      : 'This test should fail.',
        framework : 'gagarin',
        result    : 'failed',
        id        : "2",
        ancestors : [],
        timestamp : new Date(),
        duration  : 100, // in milliseconds
        browser   : 'none',
        //---------------------------
        failureType       : 'expect',
        failureMessage    : 'I did not expect the Spanish inquisition',
        failureStackTrace : new Error('some error').stack,
      } ]);
  });

  it('should be able to mark gagarin tests as completed', function () {
    return client
      .call('velocity/reports/completed', [ { framework: 'gagarin' } ]);
  });


  describe('Velocity UI.', function () {

    var client2 = browser(server);

    before(function () {
      return client2
        .click('#velocity-status-widget > .velocity-icon-status')
        .sleep(1000); // wait until animation ends
    });

    it('should be able to see the velocity panel', function () {
      return client2.waitForDOM('#velocityOverlay.visible');
    });

    it('should be able to see all the results', function () {
      return client2
        .click('.velocity-options-toggle')
        .click('#showSuccessful.btn-velocity');
    });

    it('should be able to read tests results', function () {
      return client2.execute(function () {
        return $('.velocity-result-table > tbody').children().map(function () {
          return $(this).text();
        });
      }).then(function (listOfResults) {
        expect(listOfResults).to.be.ok;
        expect(listOfResults[0]).to.match(/A super duper test.\s*\n\s*10 ms/);
        expect(listOfResults[1]).to.match(/This test should fail.\s*\n\s*Fail/);
        expect(listOfResults[2]).to.match(/I did not expect the Spanish inquisition/);
      });
    });

  });

});
