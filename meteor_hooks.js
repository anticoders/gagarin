
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
          evaluate(data.name, data.code, data.args, socket);
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
      context.value = context.value.apply(null, args || []);

      socket.write(JSON.stringify({
        value : context.value,
        name  : name,
      }));
    }).run();
  }

}
