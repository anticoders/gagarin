
/**
 * Module dependencies.
 */

var tools  = require('../tools');
var Mocha  = require('mocha');
var Base   = require('mocha').reporters.Base;
var chalk  = require('chalk');
var path   = require('path');
var util   = require('util');
var url    = require('url');
var logs2  = require('../logs2');
var table  = require('../logs2/table');
var logs   = require('../logs');

var Build   = require('../meteor/build');
var Promise = require('es6-promise').Promise;

var createParallelReporterFactory = require('./reporters').createParallelReporterFactory;

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
  var listOfFrameworks = [];
  var numberOfLinesPrinted = 0;

  // XXX gagarin user interface is defined here
  require('./interface');

  options.settings = tools.getSettings(options.settings);
  options.ui       = 'gagarin';

  var factory = !options.parallel ? null : createParallelReporterFactory(function (allStats, elapsed) {
    if (numberOfLinesPrinted > 0) {
      write('\u001b[' + numberOfLinesPrinted + 'A')
    }
    write('  elapsed time: ' + Math.floor(elapsed / 100) / 10 + 's' + '\n\n');
    numberOfLinesPrinted = 2 + table(allStats, write);
  });

  function getMocha() {

    if (options.parallel === 0 && listOfFrameworks.length > 0) {
      return listOfFrameworks[0];
    }

    var mocha = new Mocha(options);

    if (factory) {
      // overwrite the default reporter
      mocha._reporter = factory(listOfFrameworks.length);
    }

    listOfFrameworks.push(mocha);
    return mocha;

  }; // getMocha

  this.options = options;

  this.addFile = function (file) {
    getMocha().addFile(file);
  }

  this.runAllFrameworks = function (callback) {

    var listOfErrors = [];

    var pending = listOfFrameworks.slice(0);
    var counter = 0;
    var running = 0;

    if (factory) {

      // looks like parallel test runner, so make sure
      // there are no logs which can break the table view

      factory.reset();
      process.stdout.write('\n\n');
      write = logs2.block();
      logs.setSilentBuild(true);
    }

    listOfFrameworks.forEach(function (mocha) {
      mocha.loadFiles();
      mocha.files = [];
    });

    function finish() {
      if (factory) {
        logs2.unblock();
        factory.epilogue();
      }
      callback && callback(listOfErrors, counter);
    }

    function maybeFinish (action) {
      if (running <= 0 && pending <= 0) {
        finish();
      } else {
        action && action();
      }
    }

    function update() {
      var availableSlots = options.parallel > 0 ? options.parallel : 1;
      if (running >= availableSlots) {
        return false;
      }
      var next = pending.shift();
      if (!next) {
        maybeFinish();
        return false;
      }
      running += 1;
      try {
        next.run(function (numberOfFailures) {
          counter += numberOfFailures;
          running -= 1;
          maybeFinish(function () { // if not ...
            while (update());       // run as many suites as you can
          });
        });
      } catch (err) {
        listOfErrors.push(err);
        running -= 1;
        maybeFinish();
        return false;
      }
      return true;
    }

    while (update()); // run as many suites as you can

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
