
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
      var cb = arguments[arguments.length-1];

      if (arguments.length < 3) {
        args = [];
      } else {
        args = Array.isArray(args) ? args : [ args ];
      }

      //-------------------------------------------------
      return ddpClientAsPromise().then(function (ddpClient) {
        ddpClient[name](code, args, function (err) {
          cb.apply(this, arguments);
        });
      }, function (err) {
        cb(err);
      });
    }
  }

  self.promise = factory('promise');
  self.execute = factory('execute');

  self.wait = function (timeout, message, code, args) {
    var cb = arguments[arguments.length-1];

    if (arguments.length < 5) {
      args = [];
    } else {
      args = Array.isArray(args) ? args : [ args ];
    }

    //-----------------------------------------------------
    return ddpClientAsPromise().then(function (ddpClient) {
      ddpClient.wait(timeout, message, code, args, cb);
    });
  }

  self.start = function (cb) {
    return requestGagarinConfig().then(function (value) {
      cb(null, value);
    }, function (err) {
      cb(err);
    });
  };

  self.restart = function (restartTimeout) {
    var cb = arguments[arguments.length-1];

    if (arguments.length < 2) {
      restartTimeout = undefined;
    }

    return requestGagarinConfig(true, restartTimeout).then(function (value) {
      cb(null, value);
    }, function (err) {
      cb(err);
    });
  };

  self.exit = function (cb) {
    return requestGagarinConfig().then(function (config) {
      return config.exitAsPromise();
    }).then(function (value) {
      cb(null, value);
    }, function (err) {
      cb(err);
    });
  };

};

