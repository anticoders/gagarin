"use strict";

var vm = Npm.require('vm');
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');

Gagarin = {};

if (process.env.GAGARIN_SETTINGS) {

  Meteor.methods({
    '/gagarin/execute': function (code, args, closure) {
      "use strict";

      check(code, String);
      check(args, Array);
      check(closure, Object);

      var context = vm.createContext(global);
      context.Fiber = Fiber;
      try {
        vm.runInContext("value = " + wrapSourceCode(code, args, closure), context);
      } catch (err) {
        throw new Meteor.Error(400, err);
      }
      if (typeof context.value === 'function') {
        var feedback;
        try {
          feedback = context.value.apply(null, values(closure));
        } catch (err) {
          feedback = { error: err.message };
        }
        return feedback;
      }
    },

    '/gagarin/promise': function (code, args, closure) {
      "use strict";

      check(code, String);
      check(args, Array);
      check(closure, Object);

      var future = new Future();
      var context = vm.createContext(global);

      context.Fiber = Fiber;

      var chunks = [];

      var keys = Object.keys(closure).map(function (key) {
        return stringify(key) + ": " + key;
      }).join(',');

      args = args.map(stringify);

      args.unshift("(function (cb) { return function (err) { cb({ error  : err, closure: {" + keys + "}}) } })(arguments[arguments.length-1])");
      args.unshift("(function (cb) { return function (res) { cb({ result : res, closure: {" + keys + "}}) } })(arguments[arguments.length-1])");

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
        "  (" + code + ")(" + args.join(', ') + ");",
        "}"
      );

      try {
        vm.runInContext("value = " + chunks.join('\n'), context);
      } catch (err) {
        throw new Meteor.Error(err);
      }

      if (typeof context.value === 'function') {
        try {
          context.value.apply(null, values(closure, function (feedback) {
            if (feedback.error && typeof feedback.error === 'object') {
              feedback.error = feedback.error.message;
            }
            future['return'](feedback);
          }));
        } catch (err) {
          throw new Meteor.Error(err);
        }
        return future.wait();
      }
    },

    '/gagarin/wait': function (timeout, message, code, args, closure) {
      "use strict";

      check(timeout, Number);
      check(message, String);
      check(code, String);
      check(args, Array);
      check(closure, Object);

      var future  = new Future();
      var done    = false;
      var handle1 = null;
      var handle2 = null;
      var context = vm.createContext(global);

      context.Fiber = Fiber;

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

      try {
        vm.runInContext("value = " + wrapSourceCode(code, args, closure), context);
      } catch (err) {
        resolve({ error: err });
      }

      if (!done && typeof context.value === 'function') {

        (function test() {
          var feedback;
          try {
            feedback = context.value.apply(null, values(closure));
            if (feedback.result) {
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

        handle2 = setTimeout(function () {
          resolve({ error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' });
        }, timeout);
      } else {
        resolve({ err: 'code has to be a function' })
      }

      return future.wait();
    },

  });

  Meteor.startup(function () {
    console.log('Поехали!'); // Let's ride! (Gagarin, during the Vostok 1 launch)
  });

}

// HELPERS

function wrapSourceCode(code, args, closure, accessor) {
  var chunks = [];

  chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

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

function values(closure) {
  var values = Object.keys(closure).map(function (key) {
    return closure[key];
  });
  if (arguments.length > 1) {
    values.push.apply(values, Array.prototype.slice.call(arguments, 1));
  }
  return values;
}

function stringify(value) {
  if (typeof value === 'function') {
    return value.toString();
  }
  return value !== undefined ? JSON.stringify(value) : "undefined";
}

