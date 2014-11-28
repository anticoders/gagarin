var EventEmiter = require('events').EventEmitter;
var Promise = require('es6-promise').Promise;
var util = require('util');
var tools = require('./tools');
var makeSocketFactory = require('./socket');

function MeteorTransponder(requestMeteorProcess, options) {

  var self = this;

  EventEmiter.call(self); // iherits from EventEmitter

  var socketAsPromise = makeSocketFactory(self, requestMeteorProcess);

  function factory(mode) {
    return function (code) {
      var args = Array.prototype.slice.call(arguments, 1);
      var name = uniqe().toString();
      //-----------------------------------------------
      return socketAsPromise().then(function (socket) {
        socket.write(JSON.stringify({
          code: code.toString(),
          mode: mode,
          name: name,
          args: args,
        }), function () {
          // do we need this callback (?)
        });
        return new Promise(function (resolve, reject) {
          self.once(name, tools.either(reject).or(resolve));
        });
      });
    }
  }

  self.promise = factory('promise');
  self.execute = factory('execute');

  self.start = function () {
    return requestMeteorProcess();
  };

  self.restart = function (restartTimeout) {
    return requestMeteorProcess(true, restartTimeout);
  };

  self.exit = function () {
    return Promise.all([
      options.cleanUp(),
      requestMeteorProcess().then(tools.exitAsPromise)
    ]);
  };

};

util.inherits(MeteorTransponder, EventEmiter);

module.exports = MeteorTransponder;

// HELPERS

function uniqe() {
  if (!uniqe.counter) { uniqe.counter = 0; }
  return uniqe.counter++;
}
