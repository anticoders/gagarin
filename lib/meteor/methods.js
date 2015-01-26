
module.exports = {};

module.exports.promise = function (code, args) {

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    // throw new Error('args has to be an array');
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    var ddpClient = operand.ddpClient;
    var closure   = operand.closure;

    callDDPMethod(ddpClient, '/gagarin/promise', [ closure(), code.toString(), args ], closure, cb);

  });
}

module.exports.execute = function (code, args) {

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    // throw new Error('args has to be an array');
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    var ddpClient = operand.ddpClient;
    var closure   = operand.closure;

    callDDPMethod(ddpClient, '/gagarin/execute', [ closure(), code.toString(), args ], closure, cb);

  });
}

module.exports.wait = function (timeout, message, code, args) {

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    // throw new Error('args has to be an array');
    args = [ args ];

  }

  return this.__custom__(function (operand, cb) {

    var ddpClient = operand.ddpClient;
    var closure   = operand.closure;

    callDDPMethod(ddpClient, '/gagarin/wait', [ closure(), timeout, message, code.toString(), args ], closure, cb);

  });
}

function callDDPMethod (ddpClient, name, args, closure, cb) {
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
    cb(null, feedback.value);
  });
}
