
var vm = Npm.require('vm');
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');

var chai, plugins = {};

if (Gagarin.isActive) {

  chai = Npm.require('chai');

  chai.should();
  chai.use(Npm.require('chai-things'));

  plugins.chai   = chai;
  plugins.Fiber  = Fiber;
  plugins.expect = chai.expect;
  plugins.assert = chai.assert;
  plugins.either = function either (first) {
    return { or: function (second) {
        return function (arg1, arg2) { return arg1 ? first(arg1) : second(arg2) };
    }};
  };

  // TODO: also protect these methods with some authentication (user/password/token?)
  //       note that required data my be provided with GAGARIN_SETTINGS

  Meteor.methods({

    '/gagarin/execute': function (closure, code, args) {
      "use strict";

      args = args || [];

      check(code, String);
      check(args, Array);
      check(closure, Object);

      return compile(code, closure).apply({}, values(closure, function (userFunc, getClosure) {
        return { value : userFunc.apply({}, args), closure : getClosure() };
      }));

    },

    '/gagarin/promise': function (closure, code, args) {
      "use strict";

      args = args || [];

      check(code, String);
      check(args, Array);
      check(closure, Object);

      var future = new Future();

      var ready = function (feedback) {
        if (feedback.error && typeof feedback.error === 'object') {
          feedback.error = feedback.error.message;
        }
        future['return'](feedback);
      };

      return compile(code, closure).apply({}, values(closure, function (userFunc, getClosure) {
        // reject
        args.unshift(function (error) { setTimeout(function () { ready({ error: error, closure: getClosure() }); }); });

        // resolve
        args.unshift(function (value) { setTimeout(function () { ready({ value: value, closure: getClosure() }); }); });

        userFunc.apply({}, args);

      })) || future.wait();
    },

    '/gagarin/wait': function (closure, timeout, message, code, args) {
      "use strict";

      args = args || [];

      check(timeout, Number);
      check(message, String);
      check(code, String);
      check(args, Array);
      check(closure, Object);

      var future  = new Future();
      var handle1 = null;
      var handle2 = null;

      function resolve (feedback) {
        //-------------------------
        clearTimeout(handle1);
        clearTimeout(handle2);

        if (feedback.error && typeof feedback.error === 'object') {
          feedback.error = feedback.error.message;
        }
        future['return'](feedback);
      }

      return compile(code, closure).apply({}, values(closure, function (userFunc, getClosure) {        
        handle2 = setTimeout(function () {
          resolve({ closure: getClosure(), error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' });
        }, timeout);
        (function test() {
          var value;
          try {
            value = userFunc.apply({}, args);
            if (value) {
              return resolve({ closure: getClosure(), value: value });
            }
          } catch (error) {
            return resolve({ closure: getClosure(), error: error });
          }            
          handle1 = setTimeout(Meteor.bindEnvironment(test), 50); // repeat after 1/20 sec.          
        }());
      })) || future.wait();
    },

  });

  Meteor.startup(function () {
    console.log('Поехали!'); // Let's ride! (Gagarin, during the Vostok 1 launch)
  });

}

function providePlugins(code) {
  var chunks = [];
  if (typeof code === 'string') {
    code = code.split('\n');
  }
  chunks.push("function (" + Object.keys(plugins).join(', ') + ") {");
  chunks.push("  return " + code[0]);

  code.forEach(function (line, index) {
    if (index === 0) return; // omit the first line
    chunks.push("  " + line);
  });
  chunks.push("}");
  return chunks;
}

function isolateScope(code, closure) {
  if (typeof code === 'string') {
    code = code.split('\n');
  }
  var keys = Object.keys(closure).map(function (key) {
    return stringify(key) + ": " + key;
  });
  var chunks = [];

  chunks.push(
    "function (" + Object.keys(closure).join(', ') + ") {",
    "  'use strict';",
    "  return (function (userFunc, getClosure, action) {",
    "    try {",
    "      return action(userFunc, getClosure);",
    "    } catch (err) {",
    "      return { error: err.message, closure: getClosure() };",
    "    }",
    "  })("
  );

  // the code provided by the user goes here
  align(code).forEach(function (line) {
    chunks.push("    " + line);
  });
  chunks[chunks.length-1] += ',';

  chunks.push(
    // the function returning current state of the closure
    "    function () {",
    "      return { " + keys.join(', ') + " };",
    "    },",

    // the custom action
    "    arguments[arguments.length-1]",
    "  );",
    "}"
  );

  return chunks;
}

function align(code) {
  if (typeof code === 'string') {
    code = code.split('\n');
  }
  var match = code[code.length-1].match(/^(\s+)\}/);
  var regex = null;
  if (match && code[0].match(/^function/)) {
    regex = new RegExp("^" + match[1]);
    return code.map(function (line) {
      return line.replace(regex, "");
    });
  }
  return code;
}

function compile(code, closure) {
  code = providePlugins(isolateScope(code, closure)).join('\n');
  try {
    return vm.runInThisContext('(' + code + ')').apply({}, values(plugins));
  } catch (err) {
    throw new Meteor.Error(400, err);
  }
}

/**
 * Creates a source code of another function, providing the given
 * arguments and injecting the given closure variables.
 *
 * @param {String} code
 * @param {Array} args
 * @param {Object} closure
 */
function wrapSourceCode(code, args, closure) {
  "use strict";

  var chunks = [];

  chunks.push(
    "function (" + Object.keys(closure).join(', ') + ") {",
    "  'use strict';"
  );

  chunks.push(
    "  try {",
    "    return (function ($) {",
    "      return {",
    "        closure: {"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("          " + stringify(key) + ": " + key + ",");
  });

  chunks.push(
    "        },",
    "        value: $,",
    "      };",
    "    })( (" + code + ")(" + args.map(stringify).join(',') + ") );",
    "  } catch (err) {",
    "    return {",
    "      closure: {"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("        " + stringify(key) + ": " + key + ",");
  });

  chunks.push(
    "      },",
    "      error: err.message",
    "    };",
    "  }",
    "}"
  );

  return chunks;
}

/**
 * Returns all values of the object, sorted
 * alphabetically by corresponding keys.
 *
 * @param {Object}
 */
function values(object) {
  "use strict";

  var values = Object.keys(object).map(function (key) {
    return object[key];
  });
  if (arguments.length > 1) {
    values.push.apply(values, Array.prototype.slice.call(arguments, 1));
  }
  return values;
}

/**
 * A thin wrapper around JSON.stringify:
 *
 *  - `undefined` gets evaluated to "undefined"
 *  - a function gets evaluated to source code
 *
 * @param {Object} value
 */
function stringify(value) {
  "use strict";

  if (typeof value === 'function') {
    return value.toString();
  }
  return value !== undefined ? JSON.stringify(value) : "undefined";
}

