
var chalk                = require('chalk');
var Promise              = require('es6-promise').Promise;
var createFeedbackServer = require('./feedbackServer');

module.exports.mocha = function () {

  var stats  = {};
  var ready  = null;
  var server = null;

  var waitForMochaSuite = new Promise(function (resolve) {
    ready = resolve;
  });

  return this.getFreePort().__custom__(function (port, operand, done) {

    this.port = port;

    server = createFeedbackServer(port, done.bind({}, null, port)).onFeedback(function (what, data) {

      if (what === 'pass') {
        process.stdout.write(data.speed === 'fast' ? chalk.green('.') : chalk.yellow('.'));

      } else if (what === 'fail') {
        process.stdout.write(chalk.red('.'));

      } else if (what === 'end') {
        process.stdout.write('\r');

        ready(data);
      }      
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

  }).promise(function (resolve, reject) {

    Gagarin.mocha.run(function () {
      resolve();
    });

  }).then(function () {
    
    return waitForMochaSuite;

  }).then(function (data) {

    stats = data;

  }).execute(function () {

    Gagarin.mocha.setFeedbackFunction(null);
    Gagarin.connection.close();
    delete Gagarin.connection;

  }).then(function () {

    server.close();

    if (stats.failures) {
      // TODO: provide more details
       throw new Error('Mocha test suite failed with the following feedback:\n\n' + indent(stats.message, 3));
    }

  });
}


function indent(text, size) {
  var space = new Array(size+1).join(' ');
  return text.split('\n').map(function (line) {
    return space + line;
  }).join('\n');
}


