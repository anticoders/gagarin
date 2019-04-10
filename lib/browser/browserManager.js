
var portscanner = require('portscanner');
var Promise     = require('es6-promise').Promise;
var either      = require('../tools').either;
var async       = require('../tools/async');
var logs        = require('../logs');
var url         = require('url');
var wd          = require('wd');
var _           = require('lodash');

module.exports = function createBrowserManager (options) {
  var driverLocation    = options.webdriver || "http://localhost:9515"; // chromedriver default
  var browser           = wd.remote(driverLocation); 
  var dontWaitForMeteor = options.dontWaitForMeteor !== undefined ? !!options.dontWaitForMeteor : false;
  var meteorLoadTimeout = options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : 2000;
  var capabilities      = options.capabilities || {};
  var windowSize        = options.windowSize;
  var myLocation        = options.location || "http://localhost:3000";
  var browserPromise    = null;
  var getDDPSetup       = null;

  if (typeof myLocation === 'string') {
    logs.system('sending browser to meteor url: ' + myLocation);
    getDDPSetup = _.memoize(function () {
      return Promise.resolve(url.parse(myLocation));
    });
  } else if (myLocation.getDDPSetup) {
    logs.system('sending browser to meteor server.');
    getDDPSetup = myLocation.getDDPSetup;
  }

  if (!getDDPSetup) {
    throw new Error("the 'location' option must be either string or a meteor server");
  }

  return function getBrowser () {

    var isInitialized = false;

    if (browserPromise) {
      return browserPromise;
    }

    browserPromise = new Promise(function (resolve, reject) {

      function _reject (err) {
        if (isInitialized) {
          browser.quit();
        }
        if (typeof err === 'string') {
          throw new Error(err)
        }
        reject(err);
      }

      var driverLocationParsed = url.parse(driverLocation);

      portscanner.checkPortStatus(driverLocationParsed.port, driverLocationParsed.hostname, function (err, status) {
        if (err || status !== 'open') {
          logs.system('webdriver not found on ' + driverLocation, {isError: true});
          return _reject(err || 'webdriver not found on ' + driverLocation);
        }

        // NOTE: it was not easy to find in the docs, so I am leaving it here as a comment
        capabilities.loggingPrefs = { "driver": "INFO", "browser": "INFO" };

        logs.system('using webdriver at ' + driverLocation);

        // retry two times if function fails to respond after 4 seconds
        // var init = async.retry(2, async.timeout(4000, _.bind(browser.init, browser)));
        var init = _.bind(browser.init, browser);

        init(capabilities, either(_reject).or(function () {

          logs.system('browser session initialized');

          isInitialized = true;
          
          if (windowSize) {
            browser.setWindowSize(windowSize.width, windowSize.height, either(_reject).or(function () {

              logs.system('resized window to ' + JSON.stringify(windowSize));

              afterResize(either(_reject).or(resolve));
            }));
          } else {
            afterResize(either(_reject).or(resolve));
          }
        }));
      });
    });

    return browserPromise;
  };

  function afterResize (done) {
    if (getDDPSetup) {
      getDDPSetup().then(function (setup) {

        logs.system('connecting to meteor server at ' + JSON.stringify(setup));

        // TODO/HACK: The hanndling of http/https needs to be improved here and in other places, its not well respected or consistent, 
        // this at least makes more sane default assumations
        if (setup.hostname == "localhost") {
          setup.hostname = "localhost";
          setup.protocol = "http";
        } else if (!setup.protocol) {
          // no proto, assume https
          setup.protocol = "https";
        } else {
          setup.protocol = "http";
        }

        getLocation(url.format(setup), done);
      }).catch(done);
    } else {
      done(null, browser);
    }
  }

  function getLocation (url, done) {
    browser.get(url, function (err) {
      if (err) {
        return done(err);
      }

      if (dontWaitForMeteor) { // already done, so lets just resolve
        return done(null, browser);
      }

      logs.system('loading meteor app at ' + url);

      // browser.setAsyncScriptTimeout(meteorLoadTimeout, function (err) {
        // XXX asyncScriptTimeout is only relevant in "onStartup" routine
        if (err) {
          return done(err);
        }

        var handle1 = null;
        var handle2 = null;

        handle2 = setTimeout(function () {
          clearTimeout(handle1);
          done(new Error('Meteor code is still not loaded after ' + meteorLoadTimeout + ' ms'));
        }, meteorLoadTimeout);

        // wait until all meteor-related files are loaded
        (function test() {
          browser.execute("return !!window.Meteor && !!window.Meteor.startup", function (err, isOK) {
            if (err) {
              clearTimeout(handle2);
              return done(err);
            }
            if (isOK) {

              logs.system('meteor code loaded into browser');

              onStartup(function (err) {
                clearTimeout(handle2);
                done(err, !err && browser);
              });
            } else {
              // try again ...
              handle1 = setTimeout(test, 200);
            }
          });
        })();
      });
    // });
  }

  function onStartup (done) {
    browser.executeAsync(function (cb) {
      Meteor.startup(cb);
    }, done);
  }

}
