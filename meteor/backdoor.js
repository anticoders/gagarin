
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

  // TODO: also protect these methods with some authentication (user/password/token?)
  //       note that required data my be provided with GAGARIN_SETTINGS

  Meteor.methods({

    '/gagarin/execute': function (closure, code, args) {
      "use strict";

      args = args || [];

      check(code, String);
      check(args, Array);
      check(closure, Object);

      var func;

      try {
        func = vm.runInThisContext('(' + wrapSourceCode(code, args, closure, Object.keys(plugins)) + ')');
      } catch (err) {
        throw new Meteor.Error(400, err);
      }
      if (typeof func === 'function') {
        var feedback;
        try {
          feedback = func.apply({}, values(closure).concat(values(plugins)));
        } catch (err) {
          feedback = { error: err.message };
        }
        return feedback;
      }
    },

    '/gagarin/promise': function (closure, code, args) {
      "use strict";

      args = args || [];

      check(code, String);
      check(args, Array);
      check(closure, Object);

      var future = new Future();
      var chunks = [];

      var keys = Object.keys(closure).map(function (key) {
        return stringify(key) + ": " + key;
      }).join(',');

      args = args.map(stringify);

      args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout(function () { cb({ error : $, closure: {" + keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");
      args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout(function () { cb({ value : $, closure: {" + keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");

      chunks.push(
        "function (" + Object.keys(closure).concat(Object.keys(plugins)).join(', ') + ") {",
        "  'use strict';",
        "  var either = function (first) {",
        "    return {",
        "      or: function (second) {",
        "        return function (arg1, arg2) {",
        "          return arg1 ? first(arg1) : second(arg2);",
        "        };",
        "      }",
        "    };",
        "  };",
        "  try {",
        "    (" + code + ")(",
        "    " + args.join(', ') + ");",
        "  } catch ($) {",
        "    arguments[arguments.length-1]({",
        "      error   : $.message,",
        "      closure : { " + keys + " }",
        "    });",
        "  }",
        "}"
      );

      var func;

      try {
        func = vm.runInThisContext("(" + chunks.join('\n') + ")");
      } catch (err) {
        throw new Meteor.Error(err);
      }

      if (typeof func === 'function') {
        try {
          func.apply({}, values(closure).concat(values(plugins)).concat([ function (feedback) {
            if (feedback.error && typeof feedback.error === 'object') {
              feedback.error = feedback.error.message;
            }
            future['return'](feedback);
          } ]));
        } catch (err) {
          throw new Meteor.Error(err);
        }
        return future.wait();
      }
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
      var done    = false;
      var handle1 = null;
      var handle2 = null;

      function resolve (feedback) {
        // TODO: can we do away with this sentinel?
        if (done) {
          return;
        }
        done = true;
        if (!feedback.closure) {
          feedback.closure = closure;
        }
        if (feedback.error && typeof feedback.error === 'object') {
          feedback.error = feedback.error.message;
        }
        future['return'](feedback);
        //-------------------------
        clearTimeout(handle1);
        clearTimeout(handle2);
      }

      var func;

      try {
        func = vm.runInThisContext("(" + wrapSourceCode(code, args, closure, Object.keys(plugins)) + ")");
      } catch (err) {
        resolve({ error: err });
      }

      if (!done && typeof func === 'function') {

        // XXX this should be defined prior to the fist call to test, because
        //     the latter can return immediatelly
        
        handle2 = setTimeout(function () {
          resolve({ error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' });
        }, timeout);

        (function test() {
          var feedback;
          try {
            feedback = func.apply({}, values(closure).concat(values(plugins)));

            if (feedback.value || feedback.error) {
              resolve(feedback);
            }
            
            handle1 = setTimeout(Meteor.bindEnvironment(test), 50); // repeat after 1/20 sec.
            
            if (feedback.closure) {
              closure = feedback.closure;
            }

          } catch (err) {
            resolve({ error: err });
          }
        }());

      } else {
        resolve({ error: 'code has to be a function' })
      }

      return future.wait();
    },

  });

  Meteor.startup(function () {
    console.log('Поехали!'); // Let's ride! (Gagarin, during the Vostok 1 launch)
  });

}

/**
 * Creates a source code of another function, providing the given
 * arguments and injecting the given closure variables.
 *
 * @param {String} code
 * @param {Array} args
 * @param {Object} closure
 */
function wrapSourceCode(code, args, closure, listOfNames) {
  "use strict";

  var chunks = [];

  listOfNames = listOfNames || [];

  chunks.push(
    "function (" + Object.keys(closure).concat(listOfNames).join(', ') + ") {",
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

  return chunks.join('\n');
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

