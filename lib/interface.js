
/**
 * Module dependencies.
 */

var Closure = require('./closure');
var Browser = require('./browser');
var helpers = require('./helpers');
var Meteor  = require('./meteor');
var tools   = require('./tools');
var Mocha   = require('mocha');
var Fiber   = require('fibers');
var Future  = require('fibers/future');
var url     = require('url');

/**
 * Custom Mocha interface.
 */
Mocha.interfaces['gagarin'] = module.exports = function (suite) {
  "use strict";

  // TODO: allow integration with other interfaces

  // use the original bdd intrface
  Mocha.interfaces.bdd.apply(this, arguments);


  var gagarin_options  = this.options;
  var gagarin_settings = tools.getSettings(this.options.settings) || {}; // make sure it's not undefined

  suite.on('pre-require', function (context) {

    var chai     = require('chai');
    var before   = context.before;
    var after    = context.after;
    var stack    = [];

    // adding Fiber support
    context.Fiber = Fiber;

    var originalIt = context.it;
    context.it = runInsideFiber(context.it);
    context.it.skip = runInsideFiber(originalIt.skip);
    context.it.only = runInsideFiber(originalIt.only);
    context.specify = context.it;
    context.xspecify = context.xit = context.it.skip;

    context.before = runInsideFiber(context.before);
    context.beforeEach = runInsideFiber(context.beforeEach);
    context.after = runInsideFiber(context.after);
    context.afterEach = runInsideFiber(context.afterEach);

    chai.use(require('chai-things'));

    context.expect = chai.expect;

    context.meteor = function (options, initialize) {

      var myHelpers = {};

      options = options || {};
      options.flavor = options.flavor || gagarin_options.flavor || "promise";

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      tools.mergeHelpers(myHelpers, [ helpers.both, helpers.server ]);
      tools.mergeHelpers(myHelpers, gagarin_options.serverHelpers);

      var meteor = new Meteor({
        pathToApp    : options.pathToApp || gagarin_options.pathToApp,
        helpers      : tools.mergeHelpers(myHelpers, options.helpers),
        settings     : tools.getSettings(options.settings) || gagarin_settings,
        verbose      : gagarin_options.verbose,
        remoteServer : options.remoteServer || gagarin_options.remoteServer,
        skipBuild    : options.skipBuild || gagarin_options.skipBuild,
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

      if (options.flavor == "fiber") {
        var proxy = wrapPromisesForFiber(meteor, meteor.methods);
        proxy.location = meteor.location;
        return proxy;
      } else {
        return meteor;
      }
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

      options.flavor = options.flavor || gagarin_options.flavor || "promise";

      tools.mergeHelpers(myHelpers, [ helpers.both, helpers.client ]);
      tools.mergeHelpers(myHelpers, gagarin_options.clientHelpers);

      var browser = new Browser({
        helpers           : tools.mergeHelpers(myHelpers, options.helpers),
        location          : options.location,
        webdriver         : options.webdriver || gagarin_options.webdriver,
        windowSize        : options.windowSize,
        capabilities      : options.capabilities,
        dontWaitForMeteor : options.dontWaitForMeteor || gagarin_options.dontWaitForMeteor,
        meteorLoadTimeout : options.meteorLoadTimeout || gagarin_options.meteorLoadTimeout,
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

      return (options.flavor == "fiber")? wrapPromisesForFiber(browser, browser.methods) : browser;
    }

    context.ddp = function (server, options) {

      var makeDDPClient = require('./makeDDPClient');
      var ddpSetupProvider = null;

      options = options || {};

      if (server._ddpSetupProvider) {
        ddpSetupProvider = server._ddpSetupProvider;
      }

      if (typeof server === 'string') {
        ddpSetupProvider = Promise.resolve(url.parse(server || ''));
      }

      if (!ddpSetupProvider) {
        throw new Error('DDP: no server connection provided');
      }

      var ddp = makeDDPClient(ddpSetupProvider, options.helpers);

      return (options.flavor === 'fiber') ? wrapPromisesForFiber(ddp, ddp.methods) : ddp;

    }

    context.mongo = function (options) {

      var makeMongoDB = require('./makeMongoDB');

      var myHelpers = {};

      options = options || {};
      options.flavor = options.flavor || gagarin_options.flavor || "promise";

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      var mongo = makeMongoDB({
        pathToApp : options.pathToApp || gagarin_options.pathToApp,
        dbPath    : options.dbPath,
        dbName    : options.dbName,
      }, helpers);

      before(function () {
        return mongo.start();
      });

      after(function () {
        return mongo.stop();
      });

      return mongo;
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

    context.settings = JSON.parse(JSON.stringify(gagarin_settings)); // deep copy :P
  });
}

function wrapPromisesForFiber(obj, methodList) {
  var proxy = {};

  methodList.forEach(function(method) {
    var original = obj[method];
    proxy[method] = function() {
      var f = new Future();

      var promise = original.apply(obj, arguments);
      promiseAsThunk(promise)(function(error, value) {
        if (error) {
          f.throw(error);
        } else {
          f.return(value);
        }
      });
      return f.wait();
    };
  });

  return proxy;
}

function promiseAsThunk(promise, done) {
  return function(done) {
    promise.then(function(value) {
      done(null, value);
    }).catch(function(error) {
      done(error);
    });
  };
}

function runInsideFiber (originalFunction) {
  var fiberizeFunction = function(name, fn) {
    if (typeof name == "function") {
      fn = name;
      name = null;
    }

    if (fn) {
      originalFunction(name, function(done) {
        new Fiber(function() {
          if (fn.length > 0) {
            fn(done);
          } else {
            var promise = fn();
            if (promise) {
              promiseAsThunk(promise)(done);
            } else {
              done();
            }
          }
        }).run();
      });
    } else {
      originalFunction(name);
    }
  };

  return fiberizeFunction;
}