
module.exports = Remote;

function Remote(ddpClientProvider, serverControllerProvider) {
  "use strict";

  var closure = function () { return arguments.length === 0 ? {} : undefined };
  var self = this;

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

  this.useClosure = function (objectOrGetter) {
    if (typeof objectOrGetter !== 'function' && typeof objectOrGetter !== 'object') {
      throw new Error('closure must be either function or object');
    }
    closure = function (values) {
      var closure = (typeof objectOrGetter === 'function') ? objectOrGetter() : objectOrGetter;
      if (arguments.length === 0) {
        return closure ? closure.getValues() : {};
      }
      closure && closure.setValues(values);
    }
  };

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
    return serverControllerProvider().then(function (value) {
      cb(null, value);
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

  self.exit = function (cb) {
    return serverControllerProvider().then(function (controller) {
      controller.stop(cb);
    }, function (err) {
      cb(err);
    });
  };

};


