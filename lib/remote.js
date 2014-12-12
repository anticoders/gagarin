var Closure = require('./closure');

module.exports = Remote;

/**
 * Creates a meteor remote driver, which can be used to send
 * commands to meteor server.
 *
 * @param {Function} ddpClientProvider, should return a promise
 * @apram {Function} serverControllerProvider, should return a promise
 */
function Remote(ddpClientProvider, serverControllerProvider) {
  "use strict";

  var self = this;
  var closure;

  Closure.mixin(self);
  closure = self.closure.bind(self);

  this.promise = function (code, args) {
    var cb = arguments[arguments.length-1];

    if (arguments.length < 3) {
      args = [];
    } else {
      args = Array.isArray(args) ? args : [ args ];
    }

    return ddpClientProvider().then(function (ddpClient) {
      callDDPMethod(ddpClient, '/gagarin/promise',
        [ closure(), code.toString(), args ], cb);
    }, function (err) {
      cb(err);
    });
  }

  this.execute = function (code, args) {
    var cb = arguments[arguments.length-1];

    if (arguments.length < 3) {
      args = [];
    } else {
      args = Array.isArray(args) ? args : [ args ];
    }
    
    return ddpClientProvider().then(function (ddpClient) {
      callDDPMethod(ddpClient, '/gagarin/execute',
        [ closure(), code.toString(), args ], cb);
    }, function (err) {
      cb(err);
    });
  }

  this.wait = function (timeout, message, code, args) {
    var cb = arguments[arguments.length-1];

    if (arguments.length < 5) {
      args = [];
    } else {
      args = Array.isArray(args) ? args : [ args ];
    }

    // TODO: verify timeout

    return ddpClientProvider().then(function (ddpClient) {
      callDDPMethod(ddpClient, '/gagarin/wait',
        [ closure(), timeout, message, code.toString(), args ], cb);
    }, function (err) {
      cb(err);
    });
  }

  self.start = function (cb) {
    return serverControllerProvider().then(function (controller) {
      controller.start(cb);
    }, function (err) {
      cb(err);
    });
  };

  // TODO: retry a few times on error ...
  self.restart = function (restartTimeout) {
    var cb = arguments[arguments.length-1];

    if (arguments.length < 2) {
      restartTimeout = undefined;
    }

    return serverControllerProvider().then(function (controller) {
      controller.restart(cb);
    }, function (err) {
      cb(err);
    });
  };

  self.stop = function (cb) {
    return serverControllerProvider().then(function (controller) {
      controller.stop(cb);
    }, function (err) {
      cb(err);
    });
  };

  function callDDPMethod (ddpClient, name, args, cb) {
    if (!ddpClient) {
      return cb(new Error('invalid ddpClient'));
    }
    ddpClient.call(name, args, function (err, feedback) {
      if (feedback && feedback.closure) {
        closure(feedback.closure);
      }
      if (err) {
        return cb(err);
      }
      if (feedback.error) {
        return cb(new Error(feedback.error));
      }
      cb(null, feedback.result);
    });
  }

};


