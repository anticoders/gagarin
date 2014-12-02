
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
              socket.write(JSON.stringify({
                error : 'evaluation mode ' + JSON.stringify(data.mode) + ' is not supported',
                name  : data.name,
              }));
            }
          }

        } catch (err) {
          socket.write(JSON.stringify({ error: err.message }));
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
    socket.write(JSON.stringify({
      error : typeof err === 'object' ? (err && err.message) : err.toString(),
      name  : name,
    }));
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
      socket.write(JSON.stringify(data));
    }).run();
  }
}

function evaluateAsPromise(name, code, args, socket) {
  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);

  function reportError(err) {
    socket.write(JSON.stringify({
      error : typeof err === 'object' ? (err && err.message) : err.toString(),
      name  : name,
    }));
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
        socket.write(JSON.stringify({
          result : result,
          name   : name,
        }));
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
    socket.write(JSON.stringify({
      error : typeof err === 'object' ? (err && err.message) : err.toString(),
      name  : name,
    }));
  }

  try {
    vm.runInContext("value = " + code, context);
  } catch (err) {
    return reportError(err);
  }

  if (typeof context.value === 'function') {
    Fibers(function () {

      function resolve (result) {
        socket.write(JSON.stringify({
          result : result,
          name   : name,
        }));
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
