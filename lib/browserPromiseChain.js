var cleanError = require('./tools').cleanError;
var Promise    = require('es6-promise').Promise;
var either     = require('./tools').either;

module.exports = BrowserPromiseChain;

//----------------------
// BROWSER PROMISE CHAIN
//----------------------

function BrowserPromiseChain (operand, helpers) {
  "use strict";

  var self = this;

  helpers = helpers || {};

  this._operand = operand;
  this._promise = operand;
  this._helpers = helpers;

  // TODO: check for conflicts
  // install helpers
  Object.keys(helpers).forEach(function (key) {
    self[key] = helpers[key];
  });

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
  //'executeAsync',
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
    return this.applyWebDriver(name, Array.prototype.slice.call(arguments, 0));
  };

});

BrowserPromiseChain.methods = webdriverMethods.concat([
  'applyWebDriver',
  'callWebDriver',
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
BrowserPromiseChain.prototype.applyWebDriver = function (name, args, custom) {
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
        if (typeof custom === 'function') {
          return custom(operand, name, args);
        }
        return operand.browser[name].apply(operand.browser, args);
      }
    });
  });
  return self;
}

BrowserPromiseChain.prototype.callWebDriver = function (name) {
  "use strict";

  return this.applyWebDriver(name, Array.prototype.slice.call(arguments, 1));
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

BrowserPromiseChain.prototype.noWait = function () {
  "use strict";

  return BrowserPromiseChain(this._operand, this._helpers);
};

BrowserPromiseChain.prototype.yet = function (code, args) {
  "use strict";

  var args = Array.prototype.slice.call(arguments, 0);
  var self = this;
  //--------------------------------
  return self.catch(function (err) {
    return self.noWait().execute(code, args).then(function (errMessage) {
      throw new Error(err.message + ' ' + errMessage);
    });
  });
};

BrowserPromiseChain.prototype.execute = function (code, args) {
  "use strict";

  var self =  this;

  if (arguments.length < 2) {
    args = [];
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  code = codeToString(code);

  return self.applyWebDriver('execute', arguments, function (operand, name, myArgs) {
    var closure  = operand.closure ? operand.closure() : {};
    var cb       = myArgs[myArgs.length-1];

    if (typeof code === 'string' && !/^function\s+\(/.test(code)) {
      code = 'function () {\n' + code + '\n}';
    }

    if (typeof code === 'function') {
      code = code.toString();
    }

    code = wrapSourceCode(code, args, closure);

    operand.browser.execute("return (" + code + ").apply(null, arguments)",
        values(closure), feedbackProcessor(operand.closure.bind(operand), cb));
  });
}

BrowserPromiseChain.prototype.timeout = function (ms) {
  this._timeout = ms;
  return this;
}

BrowserPromiseChain.prototype.promise = function (code, args) {
  "use strict";

  var self = this;

  if (arguments.length < 2) {
    args = [];
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  code = codeToString(code);

  // we could set this 5000 globally, right?
  return self.setAsyncScriptTimeout(self._timeout || 5000).applyWebDriver('executeAsync', arguments, function (operand, name, myArgs) {

    var closure = operand.closure ? operand.closure() : {};
    var cb      = myArgs[myArgs.length-1]; // the last argument is callback
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    // stringify arguments
    args = args.map(stringify);

    args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout( function () { cb({ error : ($ && typeof $ === 'object') ? $.message : $.toString()," +
      " closure: {" + keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");

    args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout( function () { cb({ value : $, closure: {" +
      keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");

    chunks.push(
      "function (" + Object.keys(closure).join(', ') + ") {",
      "  'use strict';",
      "  var either = function (first) {",
      "    return {",
      "      or: function (second) {",
      "        return function (arg1, arg2) {",
      "          return arg1 ? first(arg1) : second(arg2);",
      "        };",
      "      }",
      "    };",
      "  };"
    );
    chunks.push(
      "  (" + code + ")(",
      "  " + args.join(', ') + ");",
      "}"
    );

    //console.log(chunks.join('\n'))

    code = chunks.join('\n');

    // TODO: how come "args" instead of values(closure) was passing as well?
    operand.browser.executeAsync("(" + code + ").apply(null, arguments)",
      values(closure), feedbackProcessor(operand.closure.bind(operand), cb));
  });

};

BrowserPromiseChain.prototype.wait = function (timeout, message, code, args) {
  "use strict";

  if (arguments.length < 4) {
    args = [];
  }

  if (typeof timeout !== 'number') {
    throw new Error('`timeout` has to be a number');
  }

  if (typeof message !== 'string') {
    throw new Error('`message` has to be a string');
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  var self = this;

  code = codeToString(code);

  return self.setAsyncScriptTimeout(2 * timeout).applyWebDriver('executeAsync', arguments, function (operand, name, myArgs) {

    var closure = operand.closure ? operand.closure() : {};
    var cb      = myArgs[myArgs.length-1]; // callback is always the last one
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
      '    var value;',
      '    try {',
      '      value = (' + code.toString() + ')(' + args.join(', ') + ');',
      '      if (value) {',
      '        clearTimeout(handle2);',
      '        cb({ value: value, closure: {' + keys + '} });',
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

    operand.browser.executeAsync("(" + code + ").apply(null, arguments)", values(closure),
      feedbackProcessor(operand.closure.bind(operand), cb));
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
    "  return (function (value) {",
    "    return {",
    "      closure: {"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("        " + stringify(key) + ": " + key + ",");
  });

  chunks.push(
    "      },",
    "      value: value,",
    "    };",
    "  })( (" + code + ")(" + args.map(stringify).join(',') + ") );",
    "}"
  );

  return chunks.join('\n');
}

