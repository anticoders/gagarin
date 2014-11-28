var EventEmiter = require('events').EventEmitter;
var Promise = require('es6-promise').Promise;
var util = require('util');
var tools = require('./tools');
var makeSocketFactory = require('./socket');

function GagarinTransponder(meteorAsPromise, options) {

  var self = this;

  EventEmiter.call(self); // iherits from EventEmitter

  var socketAsPromise = makeSocketFactory(self, meteorAsPromise);

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
    return meteorAsPromise();
  };

  self.restart = function (restartTimeout) {
    return meteorAsPromise(true, restartTimeout);
  };

  self.exit = function () {
    return Promise.all([
      options.cleanUp(),
      meteorAsPromise().then(tools.exitAsPromise)
    ]);
  };

};

util.inherits(GagarinTransponder, EventEmiter);

module.exports = GagarinTransponder;

// HELPERS

function uniqe() {
  if (!uniqe.counter) { uniqe.counter = 0; }
  return uniqe.counter++;
}
