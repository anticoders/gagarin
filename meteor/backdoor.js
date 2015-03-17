
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

    '/gagarin/execute': function (context, closure, code, args) {
      "use strict";

      args = args || [];

      check(code, String);
      check(args, Array);
      check(closure, Object);
      check(context, Object);

      return compile(code, closure).apply({}, values(closure, function (userFunc, getClosure) {
        try {
          return { value : userFunc.apply(context, args), context: context, closure : getClosure() };
        } catch (err) {
          return { error: err.message, context: context, closure: getClosure() };
        }
      }));

    },

    '/gagarin/promise': function (context, closure, code, args) {
      "use strict";

      args = args || [];

      check(code, String);
      check(args, Array);
      check(closure, Object);
      check(context, Object);

      var future = new Future();

      var ready = function (feedback) {
        if (!feedback.context) {
          feedback.context = context;
        }
        if (feedback.error && typeof feedback.error === 'object') {
          feedback.error = feedback.error.message;
        }
        future['return'](feedback);
      };

      // either return immediately (e.g. on error) or future.wait()
      return compile(code, closure).apply({}, values(closure, function (userFunc, getClosure) {
        // reject
        args.unshift(_.once(function (error) { setTimeout(function () { ready({ error: error, closure: getClosure() }); }); }));

        // resolve
        args.unshift(_.once(function (value) { setTimeout(function () { ready({ value: value, closure: getClosure() }); }); }));

        try {
          userFunc.apply(context, args);
        } catch (err) {
          return { error: err.message, context: context, closure: getClosure() };
        }

      })) || future.wait();
    },

    '/gagarin/wait': function (context, closure, timeout, message, code, args) {
      "use strict";

      args = args || [];

      check(timeout, Number);
      check(message, String);
      check(code, String);
      check(args, Array);
      check(closure, Object);
      check(context, Object);

      var future  = new Future();
      var handle1 = null;
      var handle2 = null;

      function ready(feedback) {
        //-------------------------
        clearTimeout(handle1);
        clearTimeout(handle2);
        if (!feedback.context) {
          feedback.context = context;
        }
        if (feedback.error && typeof feedback.error === 'object') {
          feedback.error = feedback.error.message;
        }
        future['return'](feedback);
      }

      // either return immediately (e.g. on error) or future.wait()
      return compile(code, closure).apply({}, values(closure, function (userFunc, getClosure) {
        handle2 = setTimeout(function () {
          ready({ closure: getClosure(), error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' });
        }, timeout);
        (function test() {
          var value;
          try {
            value = userFunc.apply(context, args);
            if (value) {
              return ready({ closure: getClosure(), value: value });
            }
          } catch (error) {
            return ready({ closure: getClosure(), error: error });
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

/**
 * Provide plugins the the local context.
 *
 * @param {(string|string[])} code
 * @returns {string[]}
 */
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

/**
 * Make sure that the only local variables visible inside the code,
 * are those from the closure object.
 *
 * @param {(string|string[])} code
 * @param {Object} closure
 * @returns {string[]}
 */
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
    // this should never happen ...
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

/**
 * Fixes the source code indentation.
 *
 * @param {(string|string[])} code
 * @returns {string[]}
 */
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

/**
 * Creates a function from the provided source code and closure object.
 *
 * @param {(string|string[])} code
 * @param {Object} closure
 * @returns {string[]}
 */
function compile(code, closure) {
  code = providePlugins(isolateScope(code, closure)).join('\n');
  try {
    return vm.runInThisContext('(' + code + ')').apply({}, values(plugins));
  } catch (err) {
    throw new Meteor.Error(400, err);
  }
}

/**
 * Returns all values of the object, sorted
 * alphabetically by corresponding keys.
 *
 * @param {Object}
 * @returns {Array}
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
 * @returns {string}
 */
function stringify(value) {
  "use strict";

  if (typeof value === 'function') {
    return value.toString();
  }
  return value !== undefined ? JSON.stringify(value) : "undefined";
}

