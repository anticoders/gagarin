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

    if (browserPromise) {
      return browserPromise;
    }

    return browserPromise = new Promise(function (resolve, reject) {

      var _reject = function (err) {
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
          //---------------
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
                if (err) {
                  return _reject(err);
                }
                // wait until meteor core packages are loaded ...
                // ... and until all other files are loaded as well
                browser.executeAsync(function (cb) {
                  var handle = setInterval(function () {
                    if (!!window.Meteor && !!window.Meteor.startup) {
                      clearInterval(handle);
                      window.Meteor.startup(cb);
                    }
                  }, 50);
                }, function (err) {
                  if (err) {
                    return _reject(err);
                  }
                  resolve({ browser: browser, closure: closure });
                });
    
              });
            });
          } // after resize
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
