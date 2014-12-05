var cleanError = require('./tools').cleanError;
var Promise    = require('es6-promise').Promise;
var Closure    = require('./closure');
var Meteor     = require('./meteor');
var Mocha      = require('mocha');
var chalk      = require('chalk');
var path       = require('path');
var util       = require('util');
var wd         = require('wd');

var BuildAsPromise = Meteor.BuildAsPromise;

module.exports = Gagarin;

function Gagarin (gagarinOptions) {

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

      var browser  = wd.promiseChainRemote(gagarinOptions.webdriver || "http://localhost:9515");
      var location = options.location;

      before(function () {
        return browser
          .init()
          .get(options.location)
          .setAsyncScriptTimeout(1000)
          .waitForConditionInBrowser('!!window.Meteor');
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

// webdriver extensions

wd.addAsyncMethod('promise', function (code, args, cb) {
  var self = this;

  if (typeof args === 'function') {
    cb = args; args = [];
  }

  args = args.map(function (arg) {
    return stringify(arg);
  });

  // ----------------------------------------------
  if (args.length > Math.max(code.length - 2, 0)) {
    return cb(new Error('You passed too many arguments: ' + args.length + ' given but expected ' + (code.length - 2) + '.'));
  }

  // TODO: also check if arguments are named properly

  args.unshift('function (err) { cb({ error: (err && err.message) || err }); }');
  args.unshift('function (res) { cb({ value: res }); }');
  
  self.executeAsync(
    '  var cb = arguments[arguments.length - 1];\n' +
    '  var either = function (first) {\n' +
    '    return {\n' +
    '      or: function (second) {\n' +
    '        return function (arg1, arg2) {\n' +
    '          return arg1 ? first(arg1) : second(arg2);\n' +
    '        };\n' +
    '      }\n' +
    '    };\n' +
    '  };\n' +
    '  (' + code.toString() + ')(' + args.join(', ') + ');\n',
    
    function (err, feedback) {
      if (err) {
        cb(err);
      } else {
        feedback.error ? cb(cleanError(feedback.error)) : cb(null, feedback.value);
      }
    }
  );

});

wd.addAsyncMethod('wait', function (timeout, message, code, args, cb) {
  var self = this;

  if (typeof args === 'function') {
    cb = args; args = [];
  }

  args = args.map(function (arg) {
    return stringify(arg);
  });

  // ----------------------------------------------
  if (args.length > Math.max(code.length - 2, 0)) {
    return cb(new Error('You passed too many arguments: ' + args.length + ' given but expected ' + (code.length - 2) + '.'));
  }

  // TODO: also check if arguments are named properly

  args.unshift('function (err) { cb({ error: (err && err.message) || err }); }');
  args.unshift('function (res) { cb({ value: res }); }');
  
  self.setAsyncScriptTimeout(2 * timeout, function () {

    self.executeAsync(

      '  var cb = arguments[arguments.length - 1];\n' +
      '  var handle = null;\n' +
      '  (function test() {\n' +
      '    var result;\n' +
      '    try {\n' +
      '      result = (' + code.toString() + ')(' + args.join(', ') + ');\n' +
      '      if (result) {\n' +
      '        cb({ value: result });\n' +
      '      } else {\n' +
      '        handle = setTimeout(test, 50);\n' + // repeat after 1/20 sec.
      '      }\n' +
      '    } catch (err) {\n' +
      '      cb({ error: err.message });\n' +
      '    }\n' +
      '  }());\n' +
      '  setTimeout(function () {\n' +
      '    clearTimeout(handle);\n' +
      '    cb({ error: ' + JSON.stringify('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.') + ' });\n' +
      '  }, ' + JSON.stringify(timeout) + ');\n',
      
      function (err, feedback) {
        if (err) {
          cb(err);
        } else {
          feedback.error ? cb(cleanError(feedback.error)) : cb(null, feedback.value);
        }
      }
    );

  });

});

function wait(timeout, message, func, args) {
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


