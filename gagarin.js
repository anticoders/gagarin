
var Promise = require('es6-promise').Promise;
var exec = require('child_process').exec;
var net = require('net');
var util = require('util');
var EventEmiter = require('events').EventEmitter;

module.exports = function Gagarin(options) {
  options = options || {};
  return new GagarinAsPromise(new Promise(function (resolve, reject) {
    // add timeout ??
    var process = exec('node ' + options.pathToApp);
    var gagarin = null;
    
    process.stdout.on('data', function (data) {
      var match;
      if (!gagarin) {
        match = /Gagarin listening at port (\d+)/.exec(data.toString());
        if (match) {
          gagarin = new GagarinAPI(process, { port: parseInt(match[1]) });
          resolve(gagarin);
        }
      }
    });

    // TODO: only log in verbose mode
    process.stderr.on('data', function (data) {
      console.error(data.toString());
    });

  }));
}

// GAGARIN AS PROMISE

function GagarinAsPromise (operand, promise) {
  this._operand = operand;
  this._promise = promise || operand;
}

['then', 'catch'].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    return new GagarinAsPromise(this._operand, this._promise[name].apply(this._promise, arguments));
  }
});

GagarinAsPromise.prototype.eval = function () {
  var self = this;
  return new GagarinAsPromise(self._operand, Promise.all([ self._operand, self._promise ]).then(function (all) {
  }));
};

// GAGARIN API

function GagarinAPI(process, options) {

  var self = this;
  var connect = new Promise(function (resolve, reject) {
    var socket = net.createConnection(options.port, function () {
      resolve(socket);
    });
    // listen to emit events
    socket.setEncoding('utf8');
    socket.on('data', function (data) {
      try {
        data = JSON.parse(data);
      } catch (err) {
        return; // ignore
      }
      if (data.name) {
        self.emit(data.name, data.value);
      }
    });
  });

  function uniqe() {
    if (!uniqe.counter) {
      uniqe.counter = 0;
    }
    return uniqe.counter++;
  }

  EventEmiter.call(this);

  self.eval = function (code) {
    // TODO: modify code
    var name = uniqe().toString();
    var args = Array.prototype.slice.call(arguments, 1);
    return connect.then(function (socket) {
      socket.write(JSON.stringify({
          name: name,
          code: code.toString(),
          args: args,
        }), function () {
          // do we need this callback (?)
        });

      return new Promise(function (resolve, reject) {
        self.once(name, function (value) {
          resolve(value);
        });
        // reject? timeout?
      });

    });
  };

  self.exit = function () {
    //socket.destroy();
    process.exit();
  };

};

util.inherits(GagarinAPI, EventEmiter);
