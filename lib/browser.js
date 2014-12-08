
var BrowserPromiseChain = require('./browserPromiseChain');
var Promise = require('es6-promise').Promise;
var wd = require('wd');

module.exports = Browser;

function Browser (options) {
  
  var browser  = wd.remote(options.webdriver);

  var browserPromise = null;

  this.getBrowserPromise = function () {
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
              resolve(browser);
            });
          });
        });
      });
    }); // Promise
  }

}

BrowserPromiseChain.methods.forEach(function (name) {
  "use strict";

  Browser.prototype[name] = function () {
    var chain = new BrowserPromiseChain(this.getBrowserPromise());
    return chain[name].apply(chain, arguments);
  };

  Browser.prototype.init = function () {
    var chain = new BrowserPromiseChain(this.getBrowserPromise());
    return chain.then(function () {
      // nothing here ...
    });
  }

});
