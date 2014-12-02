
var vm = Npm.require('vm');
var net = Npm.require('net');
var Fibers = Npm.require('fibers');
var server;

Gagarin = {};

if (Meteor.isDevelopment) {

  Meteor.startup(function () {
    server = net.createServer(function (socket) {
      socket.on('data', function (data) {
        try {
          data = JSON.parse(data);
          if (data.name && data.code) {
            if (data.mode === 'promise') {
              evaluateAsPromise(data.name, data.code, data.args, socket);

            } else if (data.mode === 'execute') {
              evaluate(data.name, data.code, data.args, socket);

            } else if (data.mode === 'wait') {
              evaluateAsWait(data.name, data.time, data.mesg, data.code, data.args, socket);

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
    }).listen(0, function () {
      console.log('Gagarin listening at port ' + server.address().port);
    });
  });

}

function evaluate(name, code, args, socket) {
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
      var data = { name: name };
      try {
        data.result = context.value.apply(null, args || []);
      } catch (err) {
        data.error = err.message;
      }
      writeToSocket(socket, name, data);
    }).run();
  }
}

function evaluateAsPromise(name, code, args, socket) {
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

      args.unshift(reportError); // reject

      args.unshift(function (result) { // resolve
        writeToSocket(socket, name, { result: result });
      });

      try {
        context.value.apply(null, args || []);
      } catch (err) {
        reportError(err);
      }

    }).run();
  }

}

function evaluateAsWait(name, timeout, message, code, args, socket) {
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
