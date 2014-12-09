"use strict";

var vm = Npm.require('vm');
var net = Npm.require('net');
var Fiber = Npm.require('fibers');
var server;
var waiting = {};

Gagarin = {};

if (Meteor.isDevelopment) {

  Meteor.startup(function () {
    server = net.createServer(function (socket) {

      socket.setEncoding('utf8');
      socket.on('data', function (chunk) {
        // TODO: it's also possible that the JSON object is splited into several chunks

        chunk.split('\n').forEach(function (line) {
          var data;

          if (line === "" || line === "\r") {
            return;
          }

          try {
            
            data = JSON.parse(line);

            // make sure undefined fields are also there
            if (data.closure && data.closureKeys) {
              data.closureKeys.forEach(function (key) {
                if (!data.closure.hasOwnProperty(key)) {
                  data.closure[key] = undefined;
                }
              });
            }

            if (data.name && data.code) {
              if (data.mode === 'promise') {
                waiting[data.name] = evaluateAsPromise(data.name, data.code, data.args, data.closure, socket);

              } else if (data.mode === 'execute') {
                waiting[data.name] = evaluate(data.name, data.code, data.args, data.closure, socket);

              } else if (data.mode === 'wait') {
                waiting[data.name] = evaluateAsWait(
                  data.name, data.time, data.mesg, data.code, data.args, data.closure, socket
                );

              } else {
                writeToSocket(socket, data.name, {
                  error : 'evaluation mode ' + JSON.stringify(data.mode) + ' is not supported'
                });
              }
            } else if (data.name && data.mode === 'pong') {
                waiting[data.name] && waiting[data.name](data.closure);

            } else {
              throw new Error('invalid payload => ' + JSON.stringify(data));
            }

          } catch (err) {
            writeToSocket(socket, null, { error: err });
          }

        });

      });
    }).listen(0, function () {
      console.log('Gagarin listening at port ' + server.address().port);
    });
  });

}

function evaluate(name, code, args, closure, socket) {
  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);
  var myFiber = null;

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

  function reportError(err) {
    writeToSocket(socket, name, { error: err });
  }

  try {
    vm.runInContext("value = " + wrapSourceCode(code, args, closure), context);
  } catch (err) {
    return reportError(err);
  }

  if (typeof context.value === 'function') {
    Fiber(function () {
      var data;
      try {
        data = context.value.apply(null, values(closure, __closure__));
      } catch (err) {
        data = { error: err.message };
      }
      data.name = name;
      writeToSocket(socket, name, data);
    }).run();
  }

  return function (values) {
    myFiber && myFiber.run(values);
  };
}

function evaluateAsPromise(name, code, args, closure, socket) {
  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);
  var myFiber = null;

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

  function reportError(err) {
    writeToSocket(socket, name, { error: err });
  }

  var chunks = [];

  var keys = Object.keys(closure).map(function (key) {
    return stringify(key) + ": " + key;
  }).join(',');

  args = args.map(stringify);

  args.unshift("(function (cb) { return function (err) { cb({ error  : err, closure: {" + keys + "}}) } })(arguments[arguments.length-1])");
  args.unshift("(function (cb) { return function (res) { cb({ result : res, closure: {" + keys + "}}) } })(arguments[arguments.length-1])");

  chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

  addSyncChunks(chunks, closure, "arguments[arguments.length-2]");

  chunks.push(
    "  (" + code + ")(" + args.join(', ') + ");",
    "}"
  );

  try {
    vm.runInContext("value = " + chunks.join('\n'), context);
  } catch (err) {
    return reportError(err);
  }

  if (typeof context.value === 'function') {
    Fiber(function () {

      try {
        context.value.apply(null, values(closure, __closure__, function (data) {
          writeToSocket(socket, name, data);
        }));
      } catch (err) {
        reportError(err);
      }

    }).run();
  }

  return function (values) {
    myFiber && myFiber.run(values);
  };
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
  socket.write(JSON.stringify(data) + '\n');
}
