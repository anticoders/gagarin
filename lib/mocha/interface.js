
/**
 * Module dependencies.
 */

var Promise = require('es6-promise').Promise;
var Closure = require('../tools/closure');
var helpers = require('../browser/helpers');
var Meteor  = require('../meteor');
var tools   = require('../tools');
var Mocha   = require('mocha');
var Fiber   = require('fibers');
var Future  = require('fibers/future');
var url     = require('url');
var path    = require('path');
var fs      = require('fs');
var logs    = require('../logs');

var fixtures = require('../fixtures');


/**
 * Custom Mocha interface.
 */
Mocha.interfaces['gagarin'] = module.exports = function (suite) {
  "use strict";

  // use the original bdd intrface
  Mocha.interfaces.bdd.apply(this, arguments);

  var gagarinOptions  = this.options;
  var gagarinSettings = tools.getSettings(this.options.settings) || {}; // make sure it's not undefined

  suite.on('pre-require', function (context) {

    var chai     = require('chai');
    var before   = context.before;
    var after    = context.after;
    var stack    = [];

    // adding Fiber support
    context.Fiber = Fiber;

    // expose part fo the fixtures API
    context.fixtures = {
      registerFileAs: fixtures.registerFileAs.bind(fixtures),
    };

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

    // TODO: allow users to configure the default asserters
    chai.use(require('chai-things'));

    context.expect = chai.expect;

    context.meteor = function (options, onStart) {

      var myHelpers = {};

      options = options || {};
      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      if (typeof options === 'function') {
        onStart = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      tools.mergeHelpers(myHelpers, options.helpers);
      var meteor = new Meteor({

        pathToApp             : options.pathToApp || gagarinOptions.pathToApp,
        helpers               : myHelpers,
        settings              : tools.getSettings(options.settings) || gagarinSettings,
        verbose               : options.verbose !== undefined ? options.verbose : gagarinOptions.verbose,
        remoteServer          : options.remoteServer || gagarinOptions.remoteServer,
        skipBuild             : options.skipBuild !== undefined ? options.skipBuild : gagarinOptions.skipBuild,
        startupTimeout        : options.startupTimeout !== undefined ? options.startupTimeout : gagarinOptions.startupTimeout,
        startupTimeout2       : options.startupTimeout2, // this one is only used for internal tests
      });

      meteor.useClosure(function () {
        return stack[stack.length-1];
      });

      if (!options.noAutoStart) {

        before(function () {
          logs.test("starting meteor instance");
          return meteor.init().startup(onStart).then(function () {
            logs.test("meteor instance ready");
          });
        });

        after(function () {
          logs.test("stopping meteor instance");
          return meteor.stop().then(function () {
            logs.test("meteor instance terminated");
          });
        });

      } else {
        if (onStart) {
          console.warn('onStart will not work with noAutoStart option set to true');
        }
      }

      if (options.flavor == "fiber") {
        var proxy = wrapPromisesForFiber(meteor, meteor.methods);
        proxy.getDDPSetup = meteor.getDDPSetup;
        proxy.useFixtures = meteor.useFixtures;
        proxy.use         = meteor.use;
        return proxy;
      } else {
        return meteor;
      }
    }

    context.browser = function (location, options, initialize) {

      var createBrowser = require('../browser');

      var myHelpers = {};

      if (arguments.length === 2) {
        if (typeof options === 'function') {
          initialize = options; options = location; location = undefined;
        }
      }

      if (arguments.length === 1) {
        if (typeof location === 'function') {
          initialize = location; options = {}; location = undefined;
        } else {
          options = location; location = undefined;  
        }
      }

      if (arguments.length === 0) {
        options = {};
      }

      if (location && typeof options !== 'object') {
        throw new Error("if 'location' is provided, argument 'options' must be an object");
      }

      if (!options || (typeof options !== 'object' && typeof options !== 'string')) {
        throw new Error("argument 'options' must be an object or a string");
      }

      if (location && typeof location !== 'string' && location.getDDPSetup === undefined) {
        throw new TypeError("argument 'location' must be a string or an instance of meteor server");
      }

      if (location && options.getDDPSetup) {
        throw new TypeError("if 'location' is provided, argument 'options' must not be an instance of meteor server");
      }

      if (location) {
        options.location = location;
      }

      if (typeof options === 'string') {
        options = { location: options };
      }

      if (options && options.getDDPSetup) {
        options = { location: options };
      }

      if (!options.location) {
        options.location = 'http://gagarin.meteor.com';
      }

      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      tools.mergeHelpers(myHelpers, options.helpers);

      var browser = createBrowser({
        helpers           : myHelpers,
        verbose           : options.verbose !== undefined ? options.verbose : gagarinOptions.verbose,
        location          : options.location,
        webdriver         : options.webdriver || gagarinOptions.webdriver,
        windowSize        : options.windowSize,
        capabilities      : options.capabilities,
        dontWaitForMeteor : options.dontWaitForMeteor !== undefined ? options.dontWaitForMeteor : gagarinOptions.dontWaitForMeteor,
        meteorLoadTimeout : options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : gagarinOptions.meteorLoadTimeout,
      });

      browser.useClosure(function () {
        return stack[stack.length-1];
      });

      before(function () {
        logs.test("starting browser instance");
        return browser.init().then(function () {
          logs.test("browser instance ready");
          if (typeof initialize === 'function') {
            return initialize.length ? browser.promise(initialize) : browser.execute(initialize);
          }
        });
      });

      after(function () {
        logs.test("stopping browser instance");
        return browser.close().quit().then(function () {
          logs.test("browser instance terminated");
        });
      });

      return (options.flavor == "fiber")? wrapPromisesForFiber(browser, browser.methods) : browser;
    }

    context.ddp = function (server, options) {

      var makeDDPClient = require('../ddp');
      var getDDPSetup = null;

      options = options || {};
      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      if (server.getDDPSetup) {
        getDDPSetup = server.getDDPSetup;
      }

      if (typeof server === 'string') {
        getDDPSetup = function () {
          var parsed = url.parse(server);
          return Promise.resolve({
            host: parsed.hostname,
            port: parsed.port || 443,
          });
        };
      }

      if (!getDDPSetup) {
        throw new Error('DDP: no server connection provided');
      }

      var ddp = makeDDPClient(getDDPSetup, options.helpers);

      return (options.flavor === 'fiber') ? wrapPromisesForFiber(ddp, ddp.methods) : ddp;

    }

    context.mongo = function (options) {

      var makeMongoDB = require('../mongo');

      options = options || {};
      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      var mongo = makeMongoDB({
        pathToApp : options.pathToApp || gagarinOptions.pathToApp,
        dbPath    : options.dbPath,
        dbName    : options.dbName,

      }, options.helpers);

      before(function () {
        return mongo.start();
      });

      after(function () {
        return mongo.stop();
      });

      return mongo;
    }

    context.closure = function (listOfKeys, runInContext) {
      var accessor = runInContext.length >= 2 ? runInContext : function (key, value) {
        return runInContext(key + (arguments.length > 1 ? '=' + stringify(value) : ''));
      }
      before(function () {
        stack.push(new Closure(stack[stack.length-1], listOfKeys, accessor));
      });
      after(function () {
        stack.pop();
      });
    };

    context.settings = JSON.parse(JSON.stringify(gagarinSettings)); // deep copy :P
  });
}

function stringify(value) {
  if (typeof value === 'function') {
    throw new Error('cannot use function as a closure variable');
  }
  return value !== undefined ? JSON.stringify(value) : "undefined";
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
      return originalFunction(name, function(done) {
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
    }
    return originalFunction(name);
  };

  return fiberizeFunction;
}
