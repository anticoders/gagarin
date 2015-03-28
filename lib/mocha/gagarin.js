
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
var logs   = require('../logs');
var table  = require('../logs/table');

var BuildAsPromise = require('../meteor/build');
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
  "use strict";

  var write = process.stdout.write.bind(process.stdout);
  var velocity = null;
  var listOfFrameworks = [];
  var numberOfLinesPrinted = 0;

  // XXX gagarin user interface is defined here
  require('./interface');

  options.settings = tools.getSettings(options.settings);
  options.ui       = 'gagarin';

  if (options.velocity) {
    velocity = require('../velocity/reporter')(function () {
      var parsed = url.parse(options.velocity);
      return Promise.resolve({ host: parsed.hostname, port: parsed.port || 443 });
    });
  }

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

    var reporter = mocha._reporter;

    if (velocity) {
      // hijack the active reporter
      mocha._reporter = function (runner, options) {
        // install the velocity reporter listeners ...
        velocity(runner);
        // ... but return the original value
        return new reporter(runner, options);
      }
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
      factory.reset();
      process.stdout.write('\n\n');
      write = logs.block();  
    }
    
    listOfFrameworks.forEach(function (mocha) {
      mocha.loadFiles();
      mocha.files = [];
    });

    function finish() {
      if (factory) {
        logs.unblock();
        factory.epilogue();
      }
      callback && callback(listOfErrors, counter);
    }

    function update() {
      var availableSlots = options.parallel > 0 ? options.parallel : 1;
      if (running >= availableSlots) {
        return false;
      }
      var next = pending.shift();
      if (!next) {
        return false;
      }
      running += 1;
      try {
        next.run(function (numberOfFailures) {
          counter += numberOfFailures;
          running -= 1;
          if (running === 0 && pending.length === 0) {
            finish();
          } else {
            while (update()); // run as many suites as you can  
          }
        });
      } catch (err) {
        listOfErrors.push(err);
        running -= 1;
        if (running === 0 && pending.length === 0) {
          finish();
        }
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
  "use strict";

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

  BuildAsPromise({

    pathToApp : pathToApp,
    skipBuild : skipBuild,
    verbose   : !muteBuild,
    timeout   : buildTimeout

  }).then(function () {

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

