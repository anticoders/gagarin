var EventEmiter = require('events').EventEmitter;
var Promise = require('es6-promise').Promise;
var util = require('util');
var tools = require('./tools');
var makeSocketFactory = require('./socket');

function MeteorTransponder(requestGagarinConfig) {

  var self = this;

  EventEmiter.call(self); // iherits from EventEmitter

  var socketAsPromise = makeSocketFactory(self, requestGagarinConfig);

  function factory(mode) {
    return function (code, args) {
      var name = uniqe().toString();

      if (arguments.length < 2) {
        args = [];
      } else {
        args = Array.isArray(args) ? args : [ args ];
      }

      //-------------------------------------------------
      return socketAsPromise().then(function (transmit) {
        transmit({
          code: code.toString(),
          mode: mode,
          name: name,
          args: args,
        }, function (err) {
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

  self.wait = function (timeout, message, code, args) {
    var name = uniqe().toString();

    if (arguments.length < 4) {
      args = [];
    } else {
      args = Array.isArray(args) ? args : [ args ];
    }

    //-------------------------------------------------
    return socketAsPromise().then(function (transmit) {
      transmit({
        code: code.toString(),
        mode: 'wait',
        name: name,
        args: args,
        time: timeout,
        mesg: message,
      }, function (err) {
        // do we need this callback (?)
      });
      return new Promise(function (resolve, reject) {
        self.once(name, tools.either(reject).or(resolve));
      });
    });
  }

  self.start = function () {
    return requestGagarinConfig();
  };

  self.restart = function (restartTimeout) {
    return requestGagarinConfig(true, restartTimeout);
  };

  self.exit = function () {
    return requestGagarinConfig().then(function (config) {
      return config.exitAsPromise();
    });
  };

};

util.inherits(MeteorTransponder, EventEmiter);

module.exports = MeteorTransponder;

// HELPERS

function uniqe() {
  if (!uniqe.counter) { uniqe.counter = 0; }
  return uniqe.counter++;
}
