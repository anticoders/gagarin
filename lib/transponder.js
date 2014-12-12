
var Promise = require('es6-promise').Promise;
var util = require('util');
var tools = require('./tools');
var either = require('./tools').either;
var makeDDPClientFactory = require('./ddp');

module.exports = MeteorTransponder;

function MeteorTransponder(requestGagarinConfig) {
  "use strict";

  var self = this;

  var ddpClientAsPromise = makeDDPClientFactory(requestGagarinConfig);

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

