var BrowserPromiseChain = require('./browserPromiseChain');
var Promise = require('es6-promise').Promise;
var Closure = require('./closure');
var wd = require('wd');

module.exports = Browser;

function Browser (options) {
  
  var self     = this;
  var browser  = wd.remote(options.webdriver);

  var browserPromise = null;

  self.getBrowserPromise = function () {
    if (browserPromise) {
      return browserPromise;
    }

    return browserPromise = new Promise(function (resolve, reject) {
      browser.init(function (err) {
        if (err) {
          return reject(err);
        }
        browser.get(options.location, function (err) {
          if (err) {
            return reject(err);
          }
          browser.setAsyncScriptTimeout(1000, function (err) {
            if (err) {
              return reject(err);
            }
            browser.waitForConditionInBrowser('!!window.Meteor', function (err) {
              if (err) {
                return reject(err);
              }
              resolve({
                browser: browser,
                closure: self.closure.bind(self), // XXX currently this binding is not required
              });
            });
          });
        });
      });
    }); // Promise
  }

  // adds "useClosure" and "closure" methods
  Closure.mixin(self);

  self.helpers = options.helpers || {};

  // TODO: check for conflicts
  Object.keys(self.helpers).forEach(function (key) {
    self[key] = self.helpers[key];
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
