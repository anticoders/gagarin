
var Mocha                   = require('mocha');
var chalk                   = require('chalk');
var logs                    = require('../logs');
var Promise                 = require('es6-promise').Promise;
var createTestResultsServer = require('./testResultsServer');

module.exports.mocha = function (suite, options) {

  var stats  = {};
  var ready  = null;
  var server = null;
  
  var mochaTestSuitePromise = null;

  options = options || {};

  if (!(suite instanceof Mocha.Suite)) {
    throw new Error("argument 'suite' must be an instance of Mocha.Suite");
  }

  return this.getFreePort().__custom__(function (port, operand, done) {

    this.port = port;

    server = createTestResultsServer(port, suite, options, function () {
      logs.test('feedback server created and listening');
      done();
    });

    mochaTestSuitePromise = new Promise(function (resolve, reject) {
      server.once('fail', reject).once('end', resolve);
    });

  }).execute(function (port) {

    Gagarin.connection = DDP.connect('http://localhost:' + port);

  }, [ function () { return this.port; } ]).wait(1000, 'until status is connected', function () {

    return Gagarin.connection.status().connected;

  }).execute(function () {

    if (!Gagarin.mocha) {
      throw new Error('first, you need to make sure mocha is initialized');
    }

    Gagarin.mocha.setFeedbackFunction(Meteor.bindEnvironment(function (what, data) {
      Gagarin.connection.call('/gagarin/feedback', what, data);
    }));

  }).promise(function (resolve) {

    Gagarin.mocha.run(resolve);

  }).then(function () {
    
    return mochaTestSuitePromise.catch(function () {
      // ignore errors this time
    });

  }).execute(function () {

    Gagarin.mocha.setFeedbackFunction(null);
    Gagarin.connection.close();
    delete Gagarin.connection;

  }).then(function () {

    logs.test('closing feedback server');

    server.close();

    // do not ingnore errors this time
    return mochaTestSuitePromise;
  });

}

