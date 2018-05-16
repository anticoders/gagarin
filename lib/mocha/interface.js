
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
var logs    = require('../logs');

import * as fs from "fs";
import * as child_process from "child_process";
import CDP  from 'chrome-remote-interface';
import util  from 'util';
import _ from "underscore";
import rightPad from "right-pad";



global.CDP = {}

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

    var chai       = require('chai');
    var before     = context.before;
    var after      = context.after;
    var beforeEach = context.beforeEach;
    var afterEach  = context.afterEach;
    var stack      = [];

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
        return proxy;
      } else {
        return meteor;
      }
    }

    context.browser = function (location, options, initialize) {

      var createBrowser = require('../browser');
      var cdp               = null; // devtools connection for coverage magic

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
        coverage          : gagarinOptions.coverage,
        webdriver         : options.webdriver || gagarinOptions.webdriver,
        windowSize        : options.windowSize,
        capabilities      : options.capabilities,
        dontWaitForMeteor : options.dontWaitForMeteor !== undefined ? options.dontWaitForMeteor : gagarinOptions.dontWaitForMeteor,
        meteorLoadTimeout : options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : gagarinOptions.meteorLoadTimeout,
      });

      function hookCDP (sessionData){
        return new Promise((resolve, reject)=>{
          session = sessionData;

          // TODO: nodify
          var remoteDebuggingPort = child_process.execSync(`ps aux | grep '${session.session.chrome.userDataDir}' | grep -oEi 'remote-debugging-port=[0-9]+' | cut -d= -f2`).toString().trim();

          console.log("Capturing Chrome Session:", session.id);

          CDP(
            {
              port: remoteDebuggingPort
            },
            (client)=>{
              // extract domains
              const {Network, Page, Profiler, Runtime} = client;

              // setup handlers
              // Network.requestWillBeSent((params) => {
              //   console.log(params.request.url);
              // });
              // Page.loadEventFired(() => {
              //   // client.close();
              // });

              Promise.all([
                Profiler.enable(),
                Network.enable(),
                Page.enable(),
                Profiler.startPreciseCoverage({
                  callCount: true,
                  detailed: true
                }),
                // must reload page to extract full coverage before init
                // if meteor connected?
                Runtime.evaluate({expression: "window.location.reload()"})
              ]).then(()=>{
                resolve(client);
              }).catch((err) => {
                reject(err)
                // client.close();
              });


            }
          );
      
        })
      }

      function generateCoverageReport(sessionId){
        let coverageData = JSON.parse(fs.readFileSync(`${gagarinOptions.pathToApp}/.gagarin/coverage-${sessionId}.json`).toString());
        let tests = coverageData.tests;
        let coverage = coverageData.coverage;

        let base_url = coverage.result[0].url;

        coverage.result.shift()

        var output = ''

        _.each(coverage.result, (result)=>{

          let pathname = url.parse(result.url).pathname;
          let path = undefined;

          if(/packages/.test(pathname) || /app/.test(pathname)){
            path = `${gagarinOptions.pathToApp}/.gagarin/local/bundle/programs/web.browser${pathname}`
          } else {
            path = `${gagarinOptions.pathToApp}/.gagarin/local/bundle/programs/web.browser/app${pathname}`
          }

          if (pathname == null || pathname == 'null' || result.url == null || result.url == 'null')
            return

          if(result.url == '')
            return;

          // FIXME: wat, chrome failure? happens when server is down and cant fetch page, so there's a chrome error page
          if(result.url == "chrome-error://chromewebdata/")
            return

          // TODO: != remote server
          if (!result.url.match(`localhost`))
            return

          if(path.match(`${gagarinOptions.pathToApp}/.gagarin/local/bundle/programs/web.browser/packages`))
            return;

          console.log("reading", path, result.url)

          let scriptRaw = fs.readFileSync(path).toString()

          let uniqFuncCount = _.uniq(_.pluck(result.functions, 'functionName')).length
          let funcCount = _.pluck(result.functions, 'functionName').length

          let uniqFuncCountWithNames = _.uniq(_.without(_.pluck(result.functions, 'functionName'), '')).length
          let funcCountWithNames = _.without(_.pluck(result.functions, 'functionName'), '').length

          let executedLines = [];
          let unexecutedLines = [];

          _.each(result.functions, (functionData, index)=>{

            let parents = result.functions.filter((data, index)=>{
              if (data.ranges[0].startOffset < functionData.ranges[0].startOffset && data.ranges[0].endOffset > functionData.ranges[0].endOffset)
                return true
            });

            let startOfLine = _.first(scriptRaw, functionData.ranges[0].startOffset).filter(function(a){ return a == "\n"; }).length + 1
            let endOfLine = _.first(scriptRaw, functionData.ranges[0].endOffset).filter(function(a){ return a == "\n"; }).length + 1


            if(functionData.ranges[0].count >= 1){
              executedLines.push(_.range(startOfLine-1, endOfLine))
            } else {
              unexecutedLines.push(_.range(startOfLine-1, endOfLine))
            }

          })

          let allHits = _.flatten(executedLines).concat(_.flatten(unexecutedLines));
          let counts = {}
          allHits.map( function (a) { if (a in counts) counts[a] ++; else counts[a] = 1; } );
          counts = _.values(counts);
          let maxSeen = Math.max(...counts);

          let script = scriptRaw.split("\n");
          let tmp = {}
          _.each(_.flatten(unexecutedLines), (lineNo, index)=>{
            if(!tmp[lineNo])
              tmp[lineNo] = {line: script[lineNo], seen: ''};
            tmp[lineNo].seen = tmp[lineNo].seen + '-'
          })
          _.each(_.flatten(executedLines), (lineNo, index)=>{
            if(!tmp[lineNo])
              tmp[lineNo] = {line: script[lineNo], seen: ''};
            tmp[lineNo].seen = tmp[lineNo].seen + '+'
          })

          script = '';
  
          _.each(tmp, (key, obj, index)=>{
            let seen = key.seen.split('')
            seen = seen.shift() + ' ' + seen.join('');
            script = script + rightPad(seen, maxSeen+1, ' ') + ' | ' + key.line + "\n";
          })

          output = output + "\n#\n# ====================\n#\n" + script

        })

        console.log("output", output.length)
        let totalExec = output.match(/^\+/gm)
        totalExec = (totalExec) ? totalExec.length : 0
        //.length
        let totalUnexec = output.match(/^\-/gm)
        totalUnexec = (totalUnexec) ? totalUnexec.length : 0
        //.length


        let covered = '';
        if(tests.length > 0){
          covered = "\n# "+tests.join("\n# ")
        } else {
          covered = "\n# Nothing executed during session. Possible un-used browser."
        }

        fs.writeFileSync(`${gagarinOptions.pathToApp}/.gagarin/coverage-${sessionId}.diff`, (
          "diff --git " + 
          `\n#\n# ${(totalExec / (totalExec + totalUnexec)*100).toFixed(2)}% coverage detected.\n#` + 
          covered +
          output
        ));

      }

      browser.useClosure(function () {
        return stack[stack.length-1];
      });
      if(gagarinOptions.coverage){
        beforeEach(function(eachDone){
          global.CDP[session.id] = false;

          let getTitles = (parent, titles)=>{
            if(parent && parent.title){
              titles.unshift(parent.title)
              return getTitles(parent.parent, titles );
            } else {
              return titles;
            }
          }

          let scopeTitle = getTitles(this.currentTest.parent, []).join(" - ");
          test = scopeTitle +": "+ this.currentTest.title;

          eachDone();
        })
        var tests = [];
        var test = undefined;
        var session           = null;
        afterEach(
          function(eachDone){
            if(global.CDP[session.id])
              tests.push(test)
            global.CDP[session.id] = false
            eachDone()
          }
        );
      }

      before(function () {
        logs.test("starting browser instance");

        if (gagarinOptions.coverage){
          return browser.session().then((session)=>{

            var remoteDebuggingPort = child_process.execSync(`ps aux | grep '${session.session.chrome.userDataDir}' | grep -oEi 'remote-debugging-port=[0-9]+' | cut -d= -f2`).toString().trim();
            // console.log("remoteDebuggingPort", remoteDebuggingPort);

            return hookCDP(session).then((client)=>{
              cdp = client;
            }).then(()=>{
              return browser.init().then(function () {
                logs.test("browser instance ready");
                if (typeof initialize === 'function') {
                  return initialize.length ? browser.promise(initialize) : browser.execute(initialize);
                }
              });
            }).catch((err)=>{
              console.log(err);
            });
          });

        } else {

          return browser.init().then(function () {
            logs.test("browser instance ready");
            if (typeof initialize === 'function') {
              return initialize.length ? browser.promise(initialize) : browser.execute(initialize);
            }
          });

        }

      });

      after(function () {
        logs.test("stopping browser instance");

        return browser.then(function () {
          return new Promise((resolve, reject)=>{

            if(gagarinOptions.coverage){
              const {Network, Page, Profiler, Runtime} = cdp;
              Profiler.takePreciseCoverage().then((coverage) => {

                console.log("Captured Chrome Session:", session.id);
                fs.writeFileSync(`${gagarinOptions.pathToApp}/.gagarin/coverage-${session.id}.json`, JSON.stringify({
                  tests: tests,
                  coverage: coverage
                }, null, 2));
                generateCoverageReport(session.id)
                console.log(" => JSON:", `${gagarinOptions.pathToApp}/.gagarin/coverage-${session.id}.json`)
                console.log(" => DIFF:", `${gagarinOptions.pathToApp}/.gagarin/coverage-${session.id}.diff`)

                browser.quit().then(()=>{
                  resolve()
                }).catch((err)=>{console.log(err)});

              }).catch((err)=>{
                throw err;
              });
            } else {
              resolve()
            }

            logs.test("browser instance terminated");

          })
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
        mongoUrl  : options.mongoUrl,
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
