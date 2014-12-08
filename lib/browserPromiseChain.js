var Promise = require('es6-promise').Promise;
var either  = require('./tools').either;

module.exports = BrowserPromiseChain;

//----------------------
// BROWSER PROMISE CHAIN
//----------------------

function BrowserPromiseChain (operand) {
  "use strict";

  this._operand = operand;
  this._promise = operand;
}

[ 'then', 'catch' ].forEach(function (name) {

  BrowserPromiseChain.prototype[name] = function () {
    "use strict";

    this._promise = this._promise[name].apply(this._promise, arguments);
    return this;
  };

});

var webdriverMethods = [
  'newWindow',
  'close',
  'quit',
  'status',
  'execute',
  'executeAsync',
  'get',
  'refresh',
  'maximize',
  'getWindowSize',
  'setWindowSize',
  'forward',
  'back',
  'waitForConditionInBrowser',
  'setAsyncScriptTimeout',
  'takeScreenshot',
  'saveScreenshot',
  'title',
  'allCookies',
  'setCookie',
  'deleteAllCookies',
  'deleteCookie',
  'getOrientation',
  'setOrientation',
  'getLocation',
];

webdriverMethods.forEach(function (name) {
  "use strict";

  BrowserPromiseChain.prototype[name] = function () {
    return this.apply(name, Array.prototype.slice.call(arguments, 0));
  };

});

BrowserPromiseChain.methods = webdriverMethods.concat([
  'apply',
  'call',
  'always',
  'sleep',
  'expectError',
  'wait',
]);

/**
 * Update the current promise and return this to allow chaining.
 */
BrowserPromiseChain.prototype.apply = function (name, args) {
  var self =  this;
  self._promise = Promise.all([
    self._operand, self._promise
  ]).then(function (all) {
    return new Promise(function (resolve, reject) {
      var operand = all[0];
      if (!operand) {
        reject(new Error('browser is undefined'));
      } else if (!operand[name]) {
        reject(new Error('browser does not implement method: ' + name));
      } else {
        args.push(either(reject).or(resolve));
        return operand[name].apply(operand, args);
      }
    });
  });
  return self;
}

BrowserPromiseChain.prototype.call = function (name) {
  "use strict";

  return this.apply(name, Array.prototype.slice.call(arguments, 1));
}

BrowserPromiseChain.prototype.always = function (callback) {
  "use strict";

  return this.then(callback, callback);
};

BrowserPromiseChain.prototype.sleep = function (timeout) {
  "use strict";

  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

BrowserPromiseChain.prototype.expectError = function (callback) {
  "use strict";

  var self = this;
  return self.then(function () {
    throw new Error('exception was not thrown');
  }, callback);
};

BrowserPromiseChain.prototype.promise = function (code, args, cb) {
  "use strict";

  var self = this;

  if (typeof args === 'function') {
    cb = args; args = [];
  }

  args = args.map(function (arg) {
    return stringify(arg);
  });

  // ----------------------------------------------
  if (args.length > Math.max(code.length - 2, 0)) {
    return cb(new Error('You passed too many arguments: ' + args.length + ' given but expected ' + (code.length - 2) + '.'));
  }

  // TODO: also check if arguments are named properly

  args.unshift('function (err) { cb({ error: (err && err.message) || err }); }');
  args.unshift('function (res) { cb({ value: res }); }');
  
  return self.executeAsync(
    '  "use strict";\n' +
    '  var cb = arguments[arguments.length - 1];\n' +
    '  var either = function (first) {\n' +
    '    return {\n' +
    '      or: function (second) {\n' +
    '        return function (arg1, arg2) {\n' +
    '          return arg1 ? first(arg1) : second(arg2);\n' +
    '        };\n' +
    '      }\n' +
    '    };\n' +
    '  };\n' +
    '  (' + code.toString() + ')(' + args.join(', ') + ');\n'

  ).then(function (feedback) {
    if (feedback.error) {
      throw cleanError(feedback.error);
    }
    return feedback.value;
  });

};

BrowserPromiseChain.prototype.wait = function (timeout, message, code, args, cb) {
  "use strict";

  var self = this;

  if (typeof args === 'function') {
    cb = args; args = [];
  }

  args = args.map(function (arg) {
    return stringify(arg);
  });

  // ----------------------------------------------
  if (args.length > Math.max(code.length - 2, 0)) {
    return cb(new Error('You passed too many arguments: ' + args.length + ' given but expected ' + (code.length - 2) + '.'));
  }

  // TODO: also check if arguments are named properly

  args.unshift('function (err) { cb({ error: (err && err.message) || err }); }');
  args.unshift('function (res) { cb({ value: res }); }');
  
  return self.setAsyncScriptTimeout(2 * timeout).executeAsync(
    '  "use strict";\n' +
    '  var cb = arguments[arguments.length - 1];\n' +
    '  var handle = null;\n' +
    '  (function test() {\n' +
    '    var result;\n' +
    '    try {\n' +
    '      result = (' + code.toString() + ')(' + args.join(', ') + ');\n' +
    '      if (result) {\n' +
    '        cb({ value: result });\n' +
    '      } else {\n' +
    '        handle = setTimeout(test, 50);\n' + // repeat after 1/20 sec.
    '      }\n' +
    '    } catch (err) {\n' +
    '      cb({ error: err.message });\n' +
    '    }\n' +
    '  }());\n' +
    '  setTimeout(function () {\n' +
    '    clearTimeout(handle);\n' +
    '    cb({ error: ' + JSON.stringify('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.') + ' });\n' +
    '  }, ' + JSON.stringify(timeout) + ');\n'
  ).then(function (feedback) {
    if (feedback.error) {
      throw cleanError(feedback.error);
    }
    return feedback.value;
  });

};
