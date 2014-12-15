var mergeHelpers = require('./tools').mergeHelpers;
var Closure      = require('./closure');
var Browser      = require('./browser');
var helpers      = require('./helpers');
var Meteor       = require('./meteor');
var Mocha        = require('mocha');

Mocha.interfaces['gagarin'] = module.exports = function (suite) {
  "use strict";

  // TODO: allow integration with other interfaces

  // use the original bdd intrface
  Mocha.interfaces.bdd.apply(this, arguments);

  var gagarinOptions = this.options;

  suite.on('pre-require', function (context) {

    var before  = context.before;
    var after   = context.after;
    var stack   = [];

    context.expect = require('chai').expect;

    context.meteor = function (options, initialize) {

      var myHelpers = {};

      options = options || {};

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      mergeHelpers(myHelpers, [ helpers.both, helpers.server ]);
      mergeHelpers(myHelpers, gagarinOptions.serverHelpers);

      var meteor = new Meteor({
        pathToApp : options.pathToApp || gagarinOptions.pathToApp,
        helpers   : mergeHelpers(myHelpers, options.helpers),
      });

      meteor.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        return meteor.start().then(function () {
          if (typeof initialize === 'function') {
            return initialize.length ? meteor.promise(initialize) : meteor.execute(initialize);
          }
        });
      });

      after(function () {
        return meteor.stop();
      });

      return meteor;
    }

    context.browser = function (options, initialize) {

      var myHelpers = {};

      options = options || {};

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { location: options };
      }

      mergeHelpers(myHelpers, [ helpers.both, helpers.client ]);
      mergeHelpers(myHelpers, gagarinOptions.clientHelpers);

      var browser = new Browser({
        helpers           : mergeHelpers(myHelpers, options.helpers),
        location          : options.location,
        webdriver         : options.webdriver || gagarinOptions.webdriver,
        windowSize        : options.windowSize,
        capabilities      : options.capabilities,
        dontWaitForMeteor : options.dontWaitForMeteor || gagarinOptions.dontWaitForMeteor,
        meteorLoadTimeout : options.meteorLoadTimeout || gagarinOptions.meteorLoadTimeout,
      });

      browser.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        return browser.init().then(function () {
          if (typeof initialize === 'function') {
            return initialize.length ? browser.promise(initialize) : browser.execute(initialize);
          }
        });
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

    //context.wait = wait;
  });

}

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


