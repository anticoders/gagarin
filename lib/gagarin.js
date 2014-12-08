var cleanError = require('./tools').cleanError;
var Promise    = require('es6-promise').Promise;
var Closure    = require('./closure');
var Browser    = require('./browser');
var Meteor     = require('./meteor');
var Mocha      = require('mocha');
var chalk      = require('chalk');
var path       = require('path');
var util       = require('util');
var wd         = require('wd');

var BuildAsPromise = Meteor.BuildAsPromise;

module.exports = Gagarin;

function Gagarin (gagarinOptions) {
  "use strict";

  // TODO: also integrate with other UI's
  gagarinOptions.ui = 'bdd';

  Mocha.call(this, gagarinOptions);

  this.suite.on('pre-require', function (context) {

    var before  = context.before;
    var after   = context.after;
    var stack   = [];

    context.expect = require('chai').expect;

    context.meteor = function (options, initialize) {

      options = options || {};

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }
      
      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      var meteor = new Meteor({
        pathToApp: options.pathToApp || gagarinOptions.pathToApp,
      });

      meteor.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        return meteor.start();
      });

      after(function () {
        return meteor.exit();
      });

      return meteor;
    }

    context.browser = function (options, initialize) {

      if (typeof options === 'string') {
        options = { location: options };
      }

      var browser  = new Browser({
        webdriver : gagarinOptions.webdriver || "http://localhost:9515",
        location  : options.location,
      });

      browser.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        return browser.init();
      });

      after(function () {
        return browser.close().quit();
      });

      return browser;
    }

    context.closure = function (listOfKeys, accessor) {
      before(function () {
        stack.push(
          new Closure(stack[stack.length-1], listOfKeys, accessor)
        );
      });
      after(function () {
        stack.pop();
      });
    };

    context.wait = wait;

  });
}

util.inherits(Gagarin, Mocha);

Gagarin.prototype.run = function (callback) {
  "use strict";

  var pathToApp = this.options.pathToApp || path.resolve('.');
  var self      = this;

  process.stdout.write('\n');

  var title = 'building app => ' + pathToApp;

  var counter = 0;
  var spinner = '/-\\|';
  var handle = setInterval(function () {
    var animated = chalk.yellow(spinner.charAt(counter++ % spinner.length));
    process.stdout.write(
      chalk.yellow('  -') + animated  + chalk.yellow('- ') + title + chalk.yellow(' -') + animated  + chalk.yellow('-\r')
    );
  }, 100);

  BuildAsPromise(pathToApp).then(function () {

    clearInterval(handle);
    process.stdout.write(chalk.green('  --- ') + chalk.gray(title) + chalk.green(' ---\r'));

    Mocha.prototype.run.call(self, callback);

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

function wait(timeout, message, func, args) {
  "use strict";

  return new Promise(function (resolve, reject) {
    var handle = null;
    (function test() {
      var result;
      try {
        result = func.apply(null, args);
        if (result) {
          resolve(result);
        } else {
          handle = setTimeout(test, 50); // repeat after 1/20 sec.
        }
      } catch (err) {
        reject(err);
      }
    }());
    setTimeout(function () {
      clearTimeout(handle);
      reject(new Error('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.'));
    }, timeout);
  });
}


