
var Promise = require('es6-promise').Promise;
var spawn = require('child_process').spawn;
var net = require('net');
var util = require('util');
var EventEmiter = require('events').EventEmitter;

module.exports = function Gagarin(options) {
  options = options || {};
  return new GagarinAsPromise(new Promise(function (resolve, reject) {
    // add timeout ??
    
    var port = 4000 + Math.floor(Math.random() * 1000);

    process.env.MONGO_URL = 'mongodb://localhost:27017/meteor';
    process.env.PORT      = port;
    process.env.ROOT_URL  = 'http://localhost:' + port;

    var meteor = spawn('node', [ options.pathToApp ], { env: process.env });
    var gagarin = null;
    
    meteor.stdout.on('data', function (data) {
      var match;
      if (!gagarin) {
        match = /Gagarin listening at port (\d+)/.exec(data.toString());
        if (match) {
          gagarin = new Transponder(meteor, { port: parseInt(match[1]) });
          resolve(gagarin);
        }
      }
    });

    // TODO: only log in verbose mode
    meteor.stderr.on('data', function (data) {
      console.error(data.toString());
    });

  }));
}

// GAGARIN AS PROMISE

function GagarinAsPromise (operand, promise) {
  this._operand = operand;
  this._promise = promise || operand;
}

GagarinAsPromise.prototype.sleep = function (timeout) {
  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

// proxies for promise methods

[ 'then', 'catch' ].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    return new GagarinAsPromise(this._operand, this._promise[name].apply(this._promise, arguments));
  }
});

// proxies for transponder methods

[ 'eval', 'kill' ].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    return new GagarinAsPromise(self._operand, Promise.all([ self._operand, self._promise ]).then(function (all) {
      return all[0][name].apply(all[0], args);
    }));
  };
});

// GAGARIN API

function Transponder(meteor, options) {

  // iherit from EventEmitter
  EventEmiter.call(this);

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
        return; // ignore?
      }
      if (data.name) {
        self.emit(data.name, data.value);
      }
    });
  });

  self.eval = function (code) {
    var args = Array.prototype.slice.call(arguments, 1);
    var name = uniqe().toString();

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

  self.kill = function () {
    //socket.destroy();
    return new Promise(function (resolve, reject) {
      meteor.once('error', function () {
        reject();
      });
      meteor.once('exit', function () {
        resolve();
      });
      meteor.kill();
    });
  };
};

util.inherits(Transponder, EventEmiter);

// HELPERS

function uniqe() {
  if (!uniqe.counter) { uniqe.counter = 0; }
  return uniqe.counter++;
}


