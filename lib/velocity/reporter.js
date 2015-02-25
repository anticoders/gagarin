
var createDDPClientManager = require('../ddp/ddpClientManager');

module.exports = function createVelocityReporter(getDDPSetup) {

  var getDDPClient = createDDPClientManager();

  function callVelocityMethod(name, data) {
    getDDPSetup().then(function (setup) {
      return getDDPClient(setup);
    }).then(function (ddpClient) {
      ddpClient.call('velocity/' + name, [ data ], function (err) {
        if (err) {
          console.warn('An error occured while trying to call velocity method.');
          console.warn(err);
        }
      });
    }).catch(function (err) {
      console.warn('An error occured while trying to connect to velocity server.')
      console.warn(err);
    });
  }

  var initialized = false;

  return function Velocity (runner) {

    function getAncestors(test) {
      if (!test) {
        return [];
      }
      var thisTitle = test.title || 'Gagarin';
      if (thisTitle.charAt(thisTitle.length-1) === '.') {
        thisTitle = thisTitle.substr(0, thisTitle.length-1);
      }
      return [ thisTitle ].concat(getAncestors(test.parent));
    }

    runner.on('start', function () {
      if (initialized) {
        return;
      }
      callVelocityMethod('register/framework', 'gagarin');
      callVelocityMethod('reports/reset', { framework: 'gagarin' });

      initialized = true;
    });

    runner.on('pass', function(test){
      callVelocityMethod('reports/submit', {
        name      : test.title,
        framework : 'gagarin',
        result    : 'passed',
        duration  : test.duration,
        ancestors : getAncestors(test),
      });
    });


    runner.on('fail', function(test, err){
      callVelocityMethod('reports/submit', {
        name      : test.title,
        framework : 'gagarin',
        result    : 'failed',
        duration  : test.duration,
        ancestors : getAncestors(test),

        // XXX do we need it for anything?
        //failureType       : err.expected ? 'expect' : 'assert',

        failureMessage    : err.message,
        failureStackTrace : err.stack,
      });
    });

    runner.on('end', function() {
      //callVelocityMethod('reports/completed', { framework: 'gagarin' });
    });
  }

}

