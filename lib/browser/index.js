
var createBrowserManager = require('./browserManager');
var browserMethods       = require('./methods');
var Closure              = require('../tools/closure');
var generic              = require('../tools/generic');

module.exports = function createBrowser (options) {
  "use strict";

  var helpers = options.helpers || {};

  var myPrototype = Object.create(helpers);

  myPrototype.init = function () {
    return this.branch().then(function () {
      // ...
    });
  }

  var methods = [
    // these methods are copy/pasted from wd
    'newWindow',
    'close',
    'quit',
    'status',
    'get',
    'refresh',
    'maximize',
    'getWindowSize',
    'setWindowSize',
    'forward',
    'back',
    'takeScreenshot',
    'saveScreenshot',
    'title',
    'allCookies',
    'setCookie',
    'deleteAllCookies',
    'deleteCookie',
    'getLocation',
  ];

  Object.keys(browserMethods).forEach(function (name) {
    myPrototype[name] = browserMethods[name];
  });

  var BrowserGeneric = generic(methods, myPrototype, function (operand, name, args, done) {
    if (!operand.browser) {
      done(new Error('operand.browser is undefined'));
    } else if (!operand.browser[name]) {
      done(new Error('operand.browser does not implement method: ' + name));
    } else {
      args.push(done);
      operand.browser[name].apply(operand.browser, args);
    }
  });

  var Browser = function () {

    var getBrowser = createBrowserManager(options);
    var closure    = null;

    function operand () {
      return getBrowser().then(function (browser) {
        return { browser: browser, closure: closure };
      });
    }

    BrowserGeneric.call(this, operand);

    Closure.mixin(this); // adds "useClosure" and "closure" methods
    closure = this.closure.bind(this);

  };

  Browser.prototype = Object.create(new BrowserGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), BrowserGeneric.prototype.methods) }
  });

  return new Browser();

}

