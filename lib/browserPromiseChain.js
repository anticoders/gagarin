var Promise = require('es6-promise').Promise;
var either  = require('./tools').either;
var cleanError = require('./tools').cleanError;

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
  "use strict";

  BrowserPromiseChain.prototype[name] = function () {

    this._promise = this._promise[name].apply(this._promise, arguments);
    return this;
  };

});

var webdriverMethods = [
  'newWindow',
  'close',
  'quit',
  'status',
  //'execute',
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
  'execute',
  'promise',
  'wait',
]);

/**
 * Update the current promise and return this to allow chaining.
 */
BrowserPromiseChain.prototype.apply = function (name, args, customApply) {
  "use strict";
  
  args = Array.prototype.slice.call(args, 0); // shallow copy the arguments

  var self = this;
  self._promise = Promise.all([
    self._operand, self._promise
  ]).then(function (all) {
    return new Promise(function (resolve, reject) {
      var operand = all[0];
      if (!operand || !operand.browser) {
        reject(new Error('operand.browser is undefined'));
      } else if (!operand.browser[name]) {
        reject(new Error('operand.browser does not implement method: ' + name));
      } else {
        args.push(either(reject).or(resolve));
        if (typeof customApply === 'function') {
          return customApply(operand, name, args);
        }
        return operand.browser[name].apply(operand.browser, args);
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

BrowserPromiseChain.prototype.execute = function () {
  "use strict";

  var self =  this;

  return self.apply('execute', arguments, function (operand, name, args) {
    var closure  = operand.closure ? operand.closure() : {};
    var code     = args[0];
    var codeArgs = args.length > 2 ? args[1] : [];
    var cb       = args[args.length-1];

    if (typeof code === 'string' && !/^function\s+\(/.test(code)) {
      code = 'function () {\n' + code + '\n}';
    }

    if (typeof code === 'function') {
      code = code.toString();
    }

    code = wrapSourceCode(code, codeArgs, closure);

    operand.browser.execute("return (" + code + ").apply(null, arguments)", values(closure), function (err, feedback) {
      if (err) {
        return cb(err);
      }
      if (feedback.closure) {
        operand.closure(feedback.closure);
      }
      if (feedback.error) {
        return cb(cleanError(feedback.error));
      }
      cb(null, feedback.result);
    });
  });
}

BrowserPromiseChain.prototype.promise = function () { // code, [args]
  "use strict";

  var self = this;

  return self.apply('executeAsync', arguments, function (operand, name, myArgs) {
    
    var closure = operand.closure ? operand.closure() : {};
    var code    = codeToString(myArgs[0]);
    var cb      = myArgs[myArgs.length-1]; // the last argument is callback
    var args    = myArgs.length >= 3 ? myArgs[1] : [];
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    // stringify arguments
    args = args.map(stringify);

    args.unshift("(function (cb) { return function (err) { cb({ error : (err && typeof err === 'object') ? err.message : err.toString()," +
      " closure: {" + keys + "}}) } })(arguments[arguments.length-1])");

    args.unshift("(function (cb) { return function (res) { cb({ value : res, closure: {" + keys + "}}) } })(arguments[arguments.length-1])");

    chunks.push(
      "function (" + Object.keys(closure).join(', ') + ") {",
      "  'use strict';"
    );
    chunks.push(
      "  (" + code + ")(" + args.join(', ') + ");",
      "}"
    );

    code = chunks.join('\n');

    operand.browser.executeAsync("(" + code + ").apply(null, arguments)", args, feedbackProcessor(operand.closure.bind(operand), cb));
  });

};

BrowserPromiseChain.prototype.wait = function () { // timeout, message, code, [args]
  "use strict";

  var self = this;

  return self.apply('executeAsync', arguments, function (operand, name, myArgs) {
    var closure = operand.closure ? operand.closure() : {};
    var cb      = myArgs[myArgs.length-1]; // callback is always the last one
    var timeout = myArgs[0];
    var message = myArgs[1];
    var code    = codeToString(myArgs[2]);
    var args    = myArgs.length >= 5 ? myArgs[3] : [];
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    args = args.map(stringify);

    chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

    chunks.push(
      '  "use strict";',
      '  var cb = arguments[arguments.length - 1];',
      '  var handle = null;',
      '  var handle2 = null;',
      '  (function test() {',
      '    var result;',
      '    try {',
      '      result = (' + code.toString() + ')(' + args.join(', ') + ');',
      '      if (result) {',
      '        clearTimeout(handle2);',
      '        cb({ value: result, closure: {' + keys + '} });',
      '      } else {',
      '        handle = setTimeout(test, 50);', // repeat after 1/20 sec.
      '      }',
      '    } catch (err) {',
      '      clearTimeout(handle2);',
      '      cb({ error: err.message, closure: {' + keys + '} });',
      '    }',
      '  }());',
      '  setTimeout(function () {',
      '    clearTimeout(handle);',
      '    handle2 = cb({ closure: {' + keys + '}, error: ' + JSON.stringify('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.') + ' });',
      '  }, ' + JSON.stringify(timeout) + ');'
    );

    chunks.push('}');

    code = chunks.join('\n');

    operand.browser.setAsyncScriptTimeout(2 * timeout, function (err) {
      if (err) {
        return cb(err);
      }
      operand.browser.executeAsync("(" + code + ").apply(null, arguments)", values(closure),
        feedbackProcessor(operand.closure.bind(operand), cb));
    });
  });


  // ----------------------------------------------
  //if (args.length > Math.max(code.length - 2, 0)) {
  //  return Promise.reject(new Error('You passed too many arguments: ' + args.length + ' given but expected ' + (code.length - 2) + '.'));
  //}

  // TODO: also check if arguments are named properly

};

function values(closure) {
  "use strict";

  var values = Object.keys(closure).map(function (key) {
    return closure[key];
  });
  if (arguments.length > 1) {
    values.push.apply(values, Array.prototype.slice.call(arguments, 1));
  }
  return values;
}

function stringify(value) {
  "use strict";

  if (typeof value === 'function') {
    return value.toString();
  }
  return value !== undefined ? JSON.stringify(value) : "undefined";
}

function codeToString(code) {
  "use strict";

  if (typeof code === 'string' && !/^function\s+\(/.test(code)) {
    return 'function () {\n' + code + '\n}';
  }
  if (typeof code === 'function') {
    return code.toString();
  }
  return code;
}

function feedbackProcessor(closure, cb) {
  "use strict";

  return function (err, feedback) {
    if (err) {
      return cb(err);
    }
    if (feedback.closure) {
      closure(feedback.closure);
    }
    if (feedback.error) {
      return cb(cleanError(feedback.error));
    }
    cb(null, feedback.value);
  }
}

function wrapSourceCode(code, args, closure) {
  "use strict";

  var chunks = [];

  chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

  //addSyncChunks(chunks, closure, accessor);

  chunks.push(
    "  return (function (result) {",
    "    return {",
    "      closure: {"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("        " + stringify(key) + ": " + key + ",");
  });

  chunks.push(
    "      },",
    "      result: result,",
    "    };",
    "  })( (" + code + ")(" + args.map(stringify).join(',') + ") );",
    "}"
  );

  return chunks.join('\n');
}

