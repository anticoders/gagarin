
var vm = Npm.require('vm');
var net = Npm.require('net');
var Fibers = Npm.require('fibers');
var server;

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
                data.closure[key] = data.closure[key] || undefined;
              });
            }

            if (data.name && data.code) {
              if (data.mode === 'promise') {
                evaluateAsPromise(data.name, data.code, data.args, data.closure, socket);

              } else if (data.mode === 'execute') {
                evaluate(data.name, data.code, data.args, data.closure, socket);

              } else if (data.mode === 'wait') {
                evaluateAsWait(data.name, data.time, data.mesg, data.code, data.args, data.closure, socket);

              } else {
                writeToSocket(socket, data.name, {
                  error : 'evaluation mode ' + JSON.stringify(data.mode) + ' is not supported'
                });
              }
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

  function reportError(err) {
    writeToSocket(socket, name, { error: err });
  }

  var chunks = [];

  chunks.push("function () {");

  Object.keys(closure).forEach(function (key) {
    chunks.push("  var " + key + " = " + stringify(closure[key]) + ';');
  });

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

  try {
    vm.runInContext("value = " + chunks.join('\n'), context);
  } catch (err) {
    return reportError(err);
  }

  if (typeof context.value === 'function') {
    Fibers(function () {
      var data;
      try {
        data = context.value();
      } catch (err) {
        data = { error: err.message };
      }
      data.name = name;
      writeToSocket(socket, name, data);
    }).run();
  }
}

function evaluateAsPromise(name, code, args, closure, socket) {
  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);

  function reportError(err) {
    writeToSocket(socket, name, { error: err });
  }

  var chunks = [];

  var keys = Object.keys(closure).map(function (key) {
    return stringify(key) + ": " + key;
  }).join(',');

  args = args.map(stringify);

  args.unshift("(function (cb) { return function (err) { cb({ error  : err, closure: {" + keys + "}}) } })(arguments[0])");
  args.unshift("(function (cb) { return function (res) { cb({ result : res, closure: {" + keys + "}}) } })(arguments[0])");

  chunks.push("function () {");

  Object.keys(closure).forEach(function (key) {
    chunks.push("  var " + key + " = " + stringify(closure[key]) + ';');
  });

  chunks.push(
    "  (" + code + ")(" + args.join(',') + ");",
    "}"
  );

  try {
    vm.runInContext("value = " + chunks.join('\n'), context);
  } catch (err) {
    return reportError(err);
  }

  if (typeof context.value === 'function') {
    Fibers(function () {

      try {
        context.value(function (data) {
          writeToSocket(socket, name, data);
        });
      } catch (err) {
        reportError(err);
      }

    }).run();
  }

}

function evaluateAsWait(name, timeout, message, code, args, closure, socket) {
  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);

  function reportError(err) {
    writeToSocket(socket, name, { error: err });
  }

  try {
    vm.runInContext("value = " + code, context);
  } catch (err) {
    return reportError(err);
  }

  if (typeof context.value === 'function') {
    Fibers(function () {

      function resolve (result) {
        writeToSocket(socket, name, { result: result });
      }

      (function test() {
        var result;
        try {
          result = context.value.apply(null, args || []);
          if (result) {
            resolve(result);
          } else {
            handle = setTimeout(Meteor.bindEnvironment(test), 50); // repeat after 1/20 sec.
          }
        } catch (err) {
          reportError(err);
        }
      }());

      setTimeout(function () {
        clearTimeout(handle);
        reportError('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.')
      }, timeout);

    }).run();
  }

}

// HELPERS

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
