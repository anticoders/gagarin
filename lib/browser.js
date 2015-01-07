var BrowserPromiseChain = require('./browserPromiseChain');
var Promise = require('es6-promise').Promise;
var Closure = require('./closure');
var wd = require('wd');

module.exports = Browser;

function Browser (options) {
  "use strict";

  var self              = this;
  var closure           = null;
  var driverLocation    = options.webdriver || "http://localhost:9515";
  var browser           = wd.remote(driverLocation); // default to chromedriver
  var myLocation        = options.location || "http://localhost:3000";             // default to meteor
  var dontWaitForMeteor = options.dontWaitForMeteor !== undefined ? !!options.dontWaitForMeteor : false;
  var meteorLoadTimeout = options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : 2000;
  var browserPromise    = null;
  var capabilities      = options.capabilities || {};
  var windowSize        = options.windowSize;
  var portscanner       = require('portscanner');
  var URL               = require('url');

  self.getBrowserPromise = function () {

    // XXX theoretically we could use promiseChainRemote here to simplify the code
    //     but I don't really want to mess up with wd's promises implementation, since
    //     we have our own here ... and all we want from them is a stable async API

    var isInitialized = false;

    if (browserPromise) {
      return browserPromise;
    }

    return browserPromise = new Promise(function (resolve, reject) {

      var _reject = function (err) {
        if (isInitialized) {
          browser.quit();
        }
        if (typeof err === 'string') {
          return reject(new Error(err));
        }
        reject(err);
      }

      var driverLocationParsed = URL.parse(driverLocation);

      portscanner.checkPortStatus(driverLocationParsed.port, driverLocationParsed.hostname, function (error, status) {
        if (status !== 'open') {
          _reject('webdriver not found on ' + driverLocation);
        }
        browser.init(capabilities, function (err) {
          if (err) {
            return _reject(err);
          }
          isInitialized = true;
          //-------------------
          if (windowSize) {
            browser.setWindowSize(windowSize.width, windowSize.height, function (err) {
              if (err) {
                _reject(err);
              }
              afterResize();
            });
          } else {
            afterResize();
          }
          //----------------------
          function afterResize() {
            browser.get(myLocation, function (err) {
              if (err) {
                return _reject(err);
              }
              if (dontWaitForMeteor) { // already done, so lets just resolve
                return resolve({ browser: browser, closure: closure });
              }
              browser.setAsyncScriptTimeout(meteorLoadTimeout, function (err) {
                // XXX asyncScriptTimeout is only relevant in "onStartup" routine
                if (err) {
                  return _reject(err);
                }

                var handle1 = null;
                var handle2 = null;

                handle2 = setTimeout(function () {
                  clearTimeout(handle1);
                  _reject(new Error('Meteor code is still not loaded after ' + meteorLoadTimeout + ' ms'));
                }, meteorLoadTimeout);

                // wait until all meteor-related files are loaded
                (function test() {
                  browser.execute("return !!window.Meteor && !!window.Meteor.startup", function (err, isOK) {
                    if (err) {
                      clearTimeout(handle2);
                      return _reject(err);
                    }

                    if (isOK) {
                      onStartup(function () {
                        clearTimeout(handle2);
                        resolve({ browser: browser, closure: closure });
                      });
                    } else {
                      handle1 = setTimeout(test, 100);
                    }
                  });
                })();

                function onStartup(callback) {
                  browser.executeAsync(function (cb) {
                    Meteor.startup(cb);
                  }, function (err) {
                    if (err) {
                      return _reject(err);
                    }
                    callback();
                  });
                }

              }); // setAsyncScriptTimeout
            }); // get
          } // afterResize
        }); // init
      }); // checkPortStatus
    }); // Promise
  }

  // adds "useClosure" and "closure" methods
  Closure.mixin(self);
  closure = self.closure.bind(self);

  // set-up helpers
  self.helpers = {};

  Object.keys(options.helpers || {}).forEach(function (key) {
    if (self[key] !== undefined) {
      console.warn('helper ' + key + ' conflicts with some Browser method');
    }
    // TODO: for each helper we should create a new promise chain,
    //       the same way we do it for BrowserPromiseChain.methods
    self[key] = self.helpers[key] = options.helpers[key];
  });
}

BrowserPromiseChain.methods.forEach(function (name) {
  "use strict";

  Browser.prototype[name] = function () {
    var chain = new BrowserPromiseChain(this.getBrowserPromise(), this.helpers);
    return chain[name].apply(chain, arguments);
  };

  Browser.prototype.init = function () {
    var chain = new BrowserPromiseChain(this.getBrowserPromise(), this.helpers);
    return chain.then(function () {
      // nothing here ...
    });
  }

});
