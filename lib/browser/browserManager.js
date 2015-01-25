
var portscanner = require('portscanner');
var Promise     = require('es6-promise').Promise;
var either      = require('../tools').either;
var url         = require('url');
var wd          = require('wd');

module.exports = function createBrowserManager (options) {
  "use strict";

  var driverLocation    = options.webdriver || "http://localhost:9515"; // chromedriver default
  var browser           = wd.remote(driverLocation); 
  var dontWaitForMeteor = options.dontWaitForMeteor !== undefined ? !!options.dontWaitForMeteor : false;
  var meteorLoadTimeout = options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : 2000;
  var capabilities      = options.capabilities || {};
  var windowSize        = options.windowSize;
  var myLocation        = options.location || "http://localhost:3000";
  var browserPromise    = null;
  var ddpSetupProvider  = typeof myLocation === 'string' ? Promise.resolve(myLocation) : myLocation._ddpSetupProvider;

  if (!ddpSetupProvider) {
    throw new Error('the location option must be either string or a meteor server');
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
          return reject(new Error(err));
        }
        reject(err);
      }

      var driverLocationParsed = url.parse(driverLocation);

      portscanner.checkPortStatus(driverLocationParsed.port, driverLocationParsed.hostname, function (err, status) {
        if (err || status !== 'open') {
          return _reject(err || 'webdriver not found on ' + driverLocation);
        }
        browser.init(capabilities, either(_reject).or(function () {
          
          isInitialized = true;
          
          if (windowSize) {
            browser.setWindowSize(windowSize.width, windowSize.height, either(_reject).or(function () {
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
    if (ddpSetupProvider) {
      ddpSetupProvider().then(function (setup) {
        if (setup.host) {
          getLocation(setup.host, done);
        } else {
          getLocation('http://localhost:' + setup.port, done);
        }
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

      browser.setAsyncScriptTimeout(meteorLoadTimeout, function (err) {
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
              onStartup(function (err) {
                clearTimeout(handle2);
                done(err, !err && browser);
              });
            } else {
              handle1 = setTimeout(test, 100);
            }
          });
        })();
      });
    });
  }

  function onStartup (done) {
    browser.executeAsync(function (cb) {
      Meteor.startup(cb);
    }, done);
  }

}
