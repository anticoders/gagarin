
/**
 * Module dependencies.
 */

var tools  = require('../tools');
var Mocha  = require('mocha');
var chalk  = require('chalk');
var path   = require('path');
var util   = require('util');
var url    = require('url');

var BuildAsPromise = require('../meteor/build');
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
  "use strict";

  var velocity = null;
  var listOfFrameworks = [];

  // XXX gagarin user interface is defined here
  require('./interface');

  options.settings = tools.getSettings(options.settings);
  options.ui = 'gagarin';

  if (options.velocity) {
    velocity = require('../velocity/reporter')(function () {
      var parsed = url.parse(options.velocity);
      return Promise.resolve({ host: parsed.hostname, port: parsed.port || 443 });
    });
  }

  function addMocha() {

    if (options.parallel === 0 && listOfFrameworks.length > 0) {
      return listOfFrameworks[0];
    }

    var mocha = new Mocha(options);
    var reporter = mocha._reporter; // original

    if (velocity) {
      // hijack the default reporter consturctor
      mocha._reporter = function (runner, options) {
        // install the velocity reporter listeners ...
        velocity(runner);
        // ... but return the original one
        return new reporter(runner, options);
      }
    }

    listOfFrameworks.push(mocha);
    return mocha;
  }

  this.options = options;

  this.addFile = function (file) {
    var mocha = addMocha();
    mocha.addFile(file);
  }

  this.runAllFrameworks = function (callback) {
    var counter = 0;
    var running = 0;
    var pending = listOfFrameworks.slice(0);

    while (update()) {}; // start as many suites as you can

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
      next.run(function (failures) {
        counter += failures;
        running -= 1;
        if (running === 0 && pending.length === 0) {
          callback(counter);
        } else {
          while (update()) {}  
        }
      });
      return true;
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
      self.runAllFrameworks(callback);
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
