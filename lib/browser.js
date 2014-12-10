var BrowserPromiseChain = require('./browserPromiseChain');
var Promise = require('es6-promise').Promise;
var Closure = require('./closure');
var wd = require('wd');

module.exports = Browser;

function Browser (options) {
  
  var self              = this;
  var closure           = null;
  var browser           = wd.remote(options.webdriver || "http://localhost:9515"); // default to chromedriver
  var myLocation        = options.location || "http://localhost:3000";             // default to meteor
  var dontWaitForMeteor = options.dontWaitForMeteor !== undefined ? !!options.dontWaitForMeteor : false;
  var meteorLoadTimeout = options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : 2000;
  var browserPromise    = null;

  self.getBrowserPromise = function () {

    // XXX theoretically we could use promiseChainRemote here to simplify the code
    //     but I don't really want to mess up with wd's promises implementation, since
    //     we have our own here ... and all we want from them is a stable async API

    if (browserPromise) {
      return browserPromise;
    }

    return browserPromise = new Promise(function (resolve, reject) {
      browser.init(function (err) {
        if (err) {
          return reject(err);
        }
        browser.get(myLocation, function (err) {
          if (err) {
            return reject(err);
          }
          if (dontWaitForMeteor) { // already done, so lets just resolve
            console.log('not waiting');
            return resolve({ browser: browser, closure: closure });
          }
          browser.setAsyncScriptTimeout(meteorLoadTimeout, function (err) {
            if (err) {
              return reject(err);
            }
            // wait until meteor core packages are loaded ...
            browser.waitForConditionInBrowser('!!window.Meteor && !!window.Meteor.startup', function (err) {
              if (err) {
                return reject(err);
              }
              // ... and until all other files are loaded as well
              browser.executeAsync(function (cb) {
                Meteor.startup(cb);
              }, function (err) {
                if (err) {
                  return reject(err);
                }
                resolve({ browser: browser, closure: closure });
              });
            });
          });
        });
      });
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
