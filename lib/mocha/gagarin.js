
/**
 * Module dependencies.
 */

var tools  = require('../tools');
var Mocha  = require('mocha');
var Runner = require('mocha').Runner;
var chalk  = require('chalk');
var path   = require('path');
var util   = require('util');
var url    = require('url');
var logs2  = require('../logs2');
var table  = require('../logs2/table');
var logs   = require('../logs');

var Build   = require('../meteor/build');
var Promise = require('es6-promise').Promise;

module.exports = Gagarin;

/**
 * Creates Gagarin with `options`.
 *
 * It inherits everything from Mocha except that the ui
 * is always set to "gagarin".
 *
 * @param {Object} options
 */

function Gagarin (options) {
  var write = process.stdout.write.bind(process.stdout);
  var numberOfLinesPrinted = 0;

  global.options = options;

  options.settings = tools.getSettings(options.settings);
  options.ui       = 'gagarin';

  // XXX gagarin user interface is defined here
  require('./interface');

  var mocha = new Mocha(options);

  function getMocha() {
    return mocha;
  }; // getMocha

  this.options = options;

  this.addFile = function (file) {
    getMocha().addFile(file);
  }

  this.runAllFrameworks = function (callback) {

    var pending = mocha; //listOfFrameworks[0]//.slice(0);
    var counter = 0;
    var running = 0;

    mocha.loadFiles();

    // Log out the number of tests to be run and the total tests to run
    var newRunner = new Runner(mocha.suite);

    if(mocha.options.grep){
      // run via grep x of y tests to run
      process.stdout.write(chalk.green(`\n  ${newRunner.grep(mocha.options.grep, false).total} of ${mocha.suite.total()} tests to run using pattern: '${mocha.options.grep}' ...\n\n`));
    } else {
      // run all
      process.stdout.write(chalk.green(`\n  ${mocha.suite.total()} of ${mocha.suite.total()} tests to run ...\n\n`));
    }

    mocha.files = [];

    try {
      mocha.run(function (numberOfFailures) {
        callback([], numberOfFailures)
      });
    } catch (err) {
      callback([err], numberOfFailures)
    }

  }
}

/**
 * A not-so-thin wrapper around Mocha.run; first build the
 * meteor app, then run the tests.
 *
 * @param {Function} callback
 */
Gagarin.prototype.run = function (callback) {
  var pathToApp = this.options.pathToApp || path.resolve('.');
  var skipBuild = !!this.options.skipBuild;
  var buildOnly = !!this.options.buildOnly;
  var muteBuild = !!this.options.muteBuild;
  var verbose   = buildOnly || (this.options.verbose !== undefined ? !!this.options.verbose : false);
  var buildTimeout = this.options.buildTimeout;
  var self      = this;

  process.stdout.write('\n');

  var title = (skipBuild ? 'skipped ' : '') + 'building app => ' + pathToApp;

  var counter = 0;
  var spinner = '/-\\|';
  var handle  = muteBuild && setInterval(function () {
    var animated = chalk.yellow(spinner.charAt(counter++ % spinner.length));
    process.stdout.write(
      chalk.yellow('  -') + animated  + chalk.yellow('- ') + title + chalk.yellow(' -') + animated  + chalk.yellow('-\r')
    );
  }, 100);

  if (!muteBuild) {
    process.stdout.write(chalk.green('  --- ') + chalk.gray(title) + chalk.green(' ---\n\n'));
  }

  new Build({

    pathToApp : pathToApp,
    skipBuild : skipBuild,
    verbose   : !muteBuild,
    timeout   : buildTimeout

  }).start()
  .then(function () {

    if (muteBuild) {
      clearInterval(handle);
      process.stdout.write(chalk.green('  --- ') + chalk.gray(title) + chalk.green(' ---\r'));
    }

    if (!muteBuild) {
      process.stdout.write(chalk.green('\n  done building ...\n\n'));
    }

    if (buildOnly) {
      callback(0);
    } else {
      self.runAllFrameworks(function (listOfErrors, failures) {
        if (listOfErrors.length > 0) {
          // since we're now loading all files prior to an further actions, this should no longer happen
          // but I am leaving this error report for now in case something unexpected happens
          console.error(chalk.red('  The following errors occured while configuring some test suites:\n'));
        }
        listOfErrors.forEach(function (err) {
          console.error(err.stack.split('\n').map(function (line) {
            return '    ' + line;
          }).join('\n') + '\n');
        });
        callback(failures + listOfErrors.length);
      });
    }

  }, function (err) {
    // clear the loading spinner
    process.stdout.write(new Array(title.length + 12).join(' '));
    clearInterval(handle);
    throw err;
  })
  .catch(function (err) {
    // make sure the error passes through promise
    setTimeout(function () {
      throw err;
    });
  });

};
