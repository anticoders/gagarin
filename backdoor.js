"use strict";

var vm = Npm.require('vm');
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var waiting = {};

Gagarin = {};

if (process.env.GAGARIN_SETTINGS) {

  Meteor.methods({
    '/gagarin/execute': function (code, args, closure) {
      // maybe we could avoid creating it multiple times?
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

      var future  = new Future();
      var done    = false;
      var handle  = null;
      var handle2 = null;
      var context = vm.createContext(global);

      context.Fiber = Fiber;

      function resolve (feedback) {
        // TODO: why do we need this sentinel?
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
            
            handle = setTimeout(Meteor.bindEnvironment(test), 50); // repeat after 1/20 sec.
            
            if (feedback.closure) {
              closure = feedback.closure;
            }

          } catch (err) {
            resolve({ error: err });
          }
        }());

        handle2 = setTimeout(function () {
          clearTimeout(handle);
          resolve({ error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' });
        }, timeout);
      } else {
        resolve({ err: 'code has to be a function' })
      }

      return future.wait();
    },

  });

  Meteor.startup(function () {
    // this is a fake, we won't need it anymore
    console.log('Gagarin ready ...');
  });

}

function evaluateAsWait(name, timeout, message, code, args, closure, socket) {
  "use strict";

  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);
  var myFiber = null;
  var handle  = null;
  var handle2 = null;

  context.Fiber = Fiber;
  
  function __closure__(values) {
    myFiber = Fiber.current;
    if (!myFiber) {
      throw new Error('you can only call $sync inside a fiber');
    }
    if (arguments.length > 0) {
      writeToSocket(socket, name, { ping: true, closure: values });
    } else {
      writeToSocket(socket, name, { ping: true });
    }
    return Fiber.yield();
  }

  function resolve (data) {
    if (!data.closure) {
      data.closure = closure;
    }
    writeToSocket(socket, name, data);
    //--------------------------------
    clearTimeout(handle2);
  }

  try {
    vm.runInContext("value = " + wrapSourceCode(code, args, closure), context);
  } catch (err) {
    return resolve({ error: err });
  }

  if (typeof context.value === 'function') {
    Fiber(function () {

      (function test() {
        var data;
        try {
          data = context.value.apply(null, values(closure, __closure__));
          if (data.result) {
            return resolve(data);
          }
          
          handle = setTimeout(Meteor.bindEnvironment(test), 50); // repeat after 1/20 sec.
          
          if (data.closure) {
            closure = data.closure;
          }

          //console.log("DATA IS", data);

        } catch (err) {
          resolve({ error: err });
        }
      }());

      handle2 = setTimeout(function () {
        clearTimeout(handle);
        resolve({ error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' });
      }, timeout);

    }).run();
  }

  return function (values) {
    myFiber && myFiber.run(values);
  };
}

// HELPERS

// TODO: make a note that users cannot use __closure__ variable for syncing

function addSyncChunks(chunks, closure, accessor) {

  // we don't want this "$sync" for now
  return;

  accessor = accessor || "arguments[arguments.length-1]";

  chunks.push(

    "  var $sync = (function (__closure__) {",
    "    return function () {",
    "      return (function (__closure__) {",
    "        console.log('==============================', c);"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("      " + key + " = __closure__.hasOwnProperty(" + JSON.stringify(key) + ") ? __closure__[" + JSON.stringify(key) + "] : " + key + ";");
  });

  chunks.push(
    "        console.log('==============================', c);",
    "        return __closure__;",
    "      })(__closure__.apply(this, arguments));",
    "    }",
    "  })(" + accessor + ");",

    // TODO: implement this feature
    "  $sync.stop = function () {};"
  );
}

function wrapSourceCode(code, args, closure, accessor) {
  var chunks = [];

  chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

  addSyncChunks(chunks, closure, accessor);

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

function writeToSocket(socket, name, data) {
  if (data.error) {
    data.error = (typeof data.error === 'object') ? (data.error && data.error.message) : data.error.toString();
  }
  if (name) {
    data.name = name;
  }
  //----------------------------------------
  socket.write(data);
}
