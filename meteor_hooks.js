
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
        } catch (err) {
          return;
        }
        if (data.name && data.code) {
          if (data.mode === 'promise') {
            evaluateAsPromise(data.name, data.code, data.args, socket);
          } else if (data.mode === 'evaluate') {
            evaluate(data.name, data.code, data.args, socket);
          } else {
            socket.write(JSON.stringify({
              name : data.name,
              what : 'error',
              resp : 'evaluation mode ' + JSON.stringify(data.mode) + ' is not supported',
            }));
          }
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

  vm.runInContext("value = " + code, context);

  if (typeof context.value === 'function') {
    Fibers(function () {
      var data = { name: name };
      try {
        data.resp = context.value.apply(null, args || []);
        data.what = 'result';
      } catch (err) {
        data.resp = err.toString();
        data.what = 'error';
      }
      socket.write(JSON.stringify(data));
    }).run();
  }
}

function evaluateAsPromise(name, code, args, socket) {
  // maybe we could avoid creating it multiple times?
  var context = vm.createContext(global);

  vm.runInContext("value = " + code, context);

  if (typeof context.value === 'function') {
    Fibers(function () {

      args.unshift(function (err) { // reject
        socket.write(JSON.stringify({
          resp : err.toString(),
          name : name,
          what : 'error',
        }));
      });

      args.unshift(function (result) { // resolve
        socket.write(JSON.stringify({
          resp : result,
          name  : name,
          what  : 'result',
        }));
      });

      context.value.apply(null, args || []);

    }).run();
  }

}
