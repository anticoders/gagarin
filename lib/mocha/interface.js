
/**
 * Module dependencies.
 */

var Closure = require('../tools/closure');
var helpers = require('../browser/helpers');
var Meteor  = require('../meteor');
var tools   = require('../tools');
var Mocha   = require('mocha');
var Fiber   = require('fibers');
var Future  = require('fibers/future');
var url     = require('url');

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

    context.meteor = function (options, initialize) {

      var myHelpers = {};

      options = options || {};
      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { pathToApp: options };
      }

      tools.mergeHelpers(myHelpers, options.helpers);

      var meteor = new Meteor({
        pathToApp    : options.pathToApp || gagarinOptions.pathToApp,
        helpers      : myHelpers,
        settings     : tools.getSettings(options.settings) || gagarinSettings,
        verbose      : gagarinOptions.verbose,
        remoteServer : options.remoteServer || gagarinOptions.remoteServer,
        skipBuild    : options.skipBuild !== undefined ? options.skipBuild : gagarinOptions.skipBuild,
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
        proxy.getDDPSetup = meteor.getDDPSetup;
        return proxy;
      } else {
        return meteor;
      }
    }

    context.browser = function (options, initialize) {

      var createBrowser = require('../browser');
      
      var myHelpers = {};

      options = options || {};

      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      if (typeof options === 'string') {
        options = { location: options };
      }

      if (options && options.getDDPSetup) {
        options = { location: options };
      }

      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      tools.mergeHelpers(myHelpers, options.helpers);

      var browser = createBrowser({
        helpers           : myHelpers,
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

      var makeDDPClient = require('../ddp');
      var getDDPSetup = null;

      options = options || {};
      options.flavor = options.flavor || gagarinOptions.flavor || "promise";

      if (server.getDDPSetup) {
        getDDPSetup = server.getDDPSetup;
      }

      if (typeof server === 'string') {
        getDDPSetup = function () { return Promise.resolve(url.parse(server || '')) };
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
        return runInContext(key + (arguments.length > 1 ? '=' + JSON.stringify(value) : ''));
      }
      before(function () {
        stack.push(
          new Closure(stack[stack.length-1], listOfKeys, accessor)
        );
      });
      after(function () {
        stack.pop();
      });
    };

    context.settings = JSON.parse(JSON.stringify(gagarinSettings)); // deep copy :P
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