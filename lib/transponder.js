var EventEmiter = require('events').EventEmitter;
var Promise = require('es6-promise').Promise;
var util = require('util');
var tools = require('./tools');
var either = require('./tools').either;
var makeDDPClientFactory = require('./ddp');

function MeteorTransponder(requestGagarinConfig) {
  "use strict";

  var self = this;

  EventEmiter.call(self); // iherits from EventEmitter

  //var socketAsPromise = makeSocketFactory(self, requestGagarinConfig);
  var ddpClientAsPromise = makeDDPClientFactory(self, requestGagarinConfig);

  function factory(name) {
    return function (code, args) {

      if (arguments.length < 2) {
        args = [];
      } else {
        args = Array.isArray(args) ? args : [ args ];
      }

      //-------------------------------------------------
      return ddpClientAsPromise().then(function (ddpClient) {
        return new Promise(function (resolve, reject) {
          ddpClient[name](code, args, either(reject).or(resolve));
        });
      });
    }
  }

  self.promise = factory('promise');
  self.execute = factory('execute');

  self.wait = function (timeout, message, code, args) {
    if (arguments.length < 4) {
      args = [];
    } else {
      args = Array.isArray(args) ? args : [ args ];
    }

    //-------------------------------------------------
    return ddpClientAsPromise().then(function (ddpClient) {
      return new Promise(function (resolve, reject) {
        ddpClient.wait(timeout, message, code, args, either(reject).or(resolve));
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
  "use strict";

  if (!uniqe.counter) { uniqe.counter = 0; }
  return uniqe.counter++;
}
