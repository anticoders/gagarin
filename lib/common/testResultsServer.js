
var logs = require('../logs');
var tools = require('../tools');
var Mocha = require('mocha');
var simpleDDPServer = require('./simpleDDPServer');

var mapSuiteToTestRunner = {};
var uniqueId = 0;

module.exports = createTestResultsServer;

/**
 * Create an instance of HttpServer, which is capable of receiving
 * remote test results and pass them to the current test runner
 * identified by the current test suite id.
 *
 * @param   {number}   port
 * @param   {object}   suite - an instance of Mocha.Suite
 * @param   {function} done - a callback
 * @returns {object}   an instance of node HttpServer
 */
function createTestResultsServer (port, suite, options, done) {

  var root   = suite;
  var silent = !!options.silent;

  while (!root.root) {
    root = root.parent;
  }

  var runner = mapSuiteToTestRunner[root._gagarinId];

  if (!runner) {
    done(new Error("no test runner is registered for suite " + gagarinTestSuiteId));
    return;
  }

  var server = null;
  
  var methods = {
    "/gagarin/feedback": function (what, data) {
      var args = Array.prototype.slice.call(arguments, 0);
      var test = new Mocha.Test(data.name);
      var err  = null;

      test.parent = suite;

      if (what === 'pass') {
        if (!silent) {
          runner.emit('pass', test);
        }
      } else if (what === 'fail') {

        err = new Error(data.failureMessage);

        err.stack    = data.failureStackTrace;
        err.actual   = data.failureActual;
        err.expected = data.failureExpected;
        err.showDiff = data.failureShowDiff;
        err.uncaught = data.failureUncaught;

        if (!silent) {
          // runner.emit('fail', test, err);  
          runner.fail(test, err);
        }
        server.emit('fail', err);

      } else if (what === 'end') {
        server.emit('end', data);
      }
    },
  };

  server = simpleDDPServer(port, methods, done);

  return server;
}

module.exports.registerTestRunner = function (suite, runner) {
  if (!suite._gagarinId) {
    suite._gagarinId = (uniqueId++).toString();
  }
  if (mapSuiteToTestRunner[suite._gagarinId]) {
    // no need to thorw an exception, but lets log a warning in the verbose mode ...
    logs.system("a test runner for suite " + suite._gagarinId + " has already been registered", { isError: true });
  }
  mapSuiteToTestRunner[suite._gagarinId] = runner;
}

module.exports.unregisterTestRunner = function (suite) {
  if (suite._gagarinId) {
    delete mapSuiteToTestRunner[suite._gagarinId];
  }
}
