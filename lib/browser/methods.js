var cleanError = require('../tools').cleanError;
var either     = require('../tools').either;
var fs         = require('fs');

module.exports = {};

module.exports.execute = function (code, args) {

  var self =  this;

  if (args === undefined) {
    args = [];
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }


  return self.__custom__(function (operand, done) {
      
    var context = this;


    var closure = operand.closure ? operand.closure() : {};

    global.CDP[operand.browser.sessionID] = true

    operand.browser.execute("return (" + wrapSourceCode(codeToString(code), args.map(stringify), context, closure) + ").apply(null, arguments)",
        values(closure), feedbackProcessor(getSetter(context), operand.closure.bind(operand), done));

  }, function (err, retry) {
    if (err.message.match(/chai not found/) && retry.count === 0) {
      // retry after reparing the problem
      return retry(function (operand, done) { loadChai(operand.browser, done) });
    }
    throw err;
  });
};

module.exports.timeout = function (ms) {
  this._timeout = ms;
  return this;
};

module.exports.promise = function (code, args) {
  "use strict";

  var self = this;

  if (args === undefined) {
    args = [];
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  // stringify arguments
  args = args.map(stringify);

  args.unshift("function ($) { setTimeout(function () { cb({ context: context, closure: closure(), error: ($ && typeof $ === 'object') ? $.message : $.toString() }) }) }");
  args.unshift("function ($) { setTimeout(function () { cb({ context: context, closure: closure(), value: $ }) }) }");

  // we could set this 5000 globally, right?

  return self.__custom__(function (operand, done) {

    global.CDP[operand.browser.sessionID] = true
    operand.browser.setAsyncScriptTimeout(self._timeout || 5000, done);

  }).__custom__(function (operand, done) {

    var context = this;
    var closure = operand.closure ? operand.closure() : {};
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    chunks.push(
      "function (" + Object.keys(closure).join(', ') + ") {",
      "  'use strict';",
      "  var expect;",
      "  var assert;",
      "  var either = function (first) {",
      "    return {",
      "      or: function (second) {",
      "        return function (arg1, arg2) {",
      "          return arg1 ? first(arg1) : second(arg2);",
      "        };",
      "      }",
      "    };",
      "  };",
      "  (function (action, closure, cb) {",
      "    var context = " + JSON.stringify(context) + ";",
      "    try {",
      "      if (!window.chai) throw new Error('chai not found');",
      "      expect = window.chai.expect;",
      "      assert = window.chai.assert;",
      "      action.apply(context, [" + args.join(", ") + "]);",
      "    } catch (err) {",
      "      cb({ error: err.message, context: context, closure: closure() });",
      "    }",
      "  })(" + codeToString(code) + ", function () {",
      "    return { " + keys + " };",
      "  }, arguments[arguments.length-1]);",
      "}"
    );

    // TODO: how come "args" instead of values(closure) was working fine as well?
    operand.browser.executeAsync("(" + chunks.join('\n') + ").apply(null, arguments)",
      values(closure), feedbackProcessor(getSetter(context), operand.closure.bind(operand), done));

  }, function (err, retry) {
    if (err.message.match(/chai not found/) && retry.count === 0) {
      // retry after reparing the problem
      return retry(function (operand, done) { loadChai(operand.browser, done) });
    }
    throw err;
  });

};

module.exports.session = function () {

  var self = this;

  return self.__custom__(function (operand, done) {
    var id = operand.browser.getSessionID();
    operand.browser.altSessionCapabilities(
      function(error, session){
        // console.log("error, session", error, session)
        done(null, {
          id: id,
          session: session
        });
      }
    );

    return undefined;
  })
};

module.exports.wait = function (timeout, message, code, args) {
  "use strict";

  if (args === undefined) {
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

  args = args.map(stringify);

  var self = this;

  return self.__custom__(function (operand, done) {

    global.CDP[operand.browser.sessionID] = true
    operand.browser.setAsyncScriptTimeout(2 * timeout, done);

  }).__custom__(function (operand, done) {

    var context = this;
    var closure = operand.closure ? operand.closure() : {};
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    chunks.push(
      "function (" + Object.keys(closure).join(', ') + ") {",
      "  'use strict';",
      "  var expect;",
      "  var assert;",
      "  (function (action, closure, cb) {",
      "    var context = " + JSON.stringify(context) + ";",

      "    if (!window.chai) return cb({ closure: closure(), error: 'chai not found' });",
      "    expect = window.chai.expect;",
      "    assert = window.chai.assert;",

      '    var handle1 = null;',
      '    var handle2 = window.setTimeout(function () {',
      '      window.clearTimeout(handle1);',
      '      cb({ context: context, closure: closure(), error: ' + JSON.stringify('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.') + ' });',
      '    }, ' + JSON.stringify(timeout) + ');',

      '    (function test() {',
      '      var value;',
      '      try {',
      '        value = action.apply(context, [' + args.join(', ') + ']);',
      '        if (value) {',
      '          window.clearTimeout(handle2);',
      '          cb({ value: value, context: context, closure: closure() });',
      '        } else {',
      '          handle1 = window.setTimeout(test, 50);', // repeat after 1/20 sec.
      '        }',
      '      } catch (err) {',
      '        window.clearTimeout(handle2);',
      '        cb({ error: err.message, context: context, closure: closure() });',
      '      }',
      '    }());',

      "  })(" + codeToString(code) + ", function () {",
      "    return { " + keys + " };",
      "  }, arguments[arguments.length-1]);",
      "}"
    );

    operand.browser.executeAsync("(" + chunks.join('\n') + ").apply(null, arguments)", values(closure),
      feedbackProcessor(getSetter(context), operand.closure.bind(operand), done));

  }, function (err, retry) {
    if (err.message.match(/chai not found/) && retry.count === 0) {
      // retry after reparing the problem
      return retry(function (operand, done) { loadChai(operand.browser, done) });
    }
    throw err;
  });

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

  var test;

  if (typeof code === 'string' && !/^function\s+\(/.test(code)) {
    return 'function () {\n' + code + '\n}';
  }
  if (typeof code === 'function') {
    return code.toString();
  }

  eval("test = " + code); // XXX it may throw on syntax error

  return code;
}

function feedbackProcessor(context, closure, cb) {
  "use strict";

  return function (err, feedback) {
    if (err) {
      return cb(err);
    }
    if (feedback.context) {
      context(feedback.context);
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

function wrapSourceCode(code, args, context, closure) {
  "use strict";

  var keys = Object.keys(closure).map(function (key) {
    return stringify(key) + ": " + key;
  }).join(',');

  var chunks = [];

  chunks.push(
    "function (" + Object.keys(closure).join(', ') + ") {",
    "  'use strict';",
    "  var expect;",
    "  var assert;",
    "  return (function (action, closure, cb) {",
    "    var context = " + JSON.stringify(context) + ";",
    "    try {",
    "      if (!window.chai) throw new Error('chai not found');",
    "      expect = window.chai.expect;",
    "      assert = window.chai.assert;",
    "      return { value: action.apply(context, [" + args.join(", ") + "]), context: context, closure: closure() };",
    "    } catch (err) {",
    "      return { error: err.message, context: context, closure: closure() };",
    "    }",
    "  })(" + codeToString(code) + ", function () {",
    "    return { " + keys + " };",
    "  });",
    "}"
  );
  
  return chunks.join('\n');
}

function getSetter(object) {
  "use strict";

  return function setter (updates) {
    Object.keys(updates).forEach(function (key) {
      object[key] = updates[key];
    });
  }
}

function loadChai (browser, done) {

  var path       = require('path');
  var chai       = fs.readFileSync(path.resolve(__dirname, '..', '..', 'node_modules', 'chai', 'chai.js'),'utf8');
  var chaiThings = fs.readFileSync(path.resolve(__dirname, '..', '..', 'node_modules', 'chai-things', 'lib', 'chai-things.js'), 'utf8');

  browser.execute(function (chaiSrc, chaiThingsSrc) {

    var chaiScript = document.createElement('script');
    chaiScript.text = chaiSrc;
    window.document.head.appendChild(chaiScript);

    var chaiThingsScript = document.createElement('script');
    chaiThingsScript.text = chaiThingsSrc;
    window.document.head.appendChild(chaiThingsScript);
    chai.should(); // initialize chai things

  }, [ chai, chaiThings ] , done);

}

