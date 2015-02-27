
module.exports = {};

module.exports.promise = function (code, args) {
  "use strict";

  var deprecated = false;

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('promise', 'code, arg');

    var ddpClient = operand.ddpClient;
    var closure   = operand.closure;

    callDDPMethod(ddpClient, '/gagarin/promise', [ closure(), code.toString(), args ], closure, cb);

  });
}

module.exports.execute = function (code, args) {
  "use strict";

  var deprecated = false;

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('execute', 'code, arg');

    var ddpClient = operand.ddpClient;
    var closure   = operand.closure;

    callDDPMethod(ddpClient, '/gagarin/execute', [ closure(), code.toString(), args ], closure, cb);

  });
}

module.exports.wait = function (timeout, message, code, args) {
  "use strict";

  var deprecated = false;

  if (arguments.length < 4) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('wait', 'timeout, message, code, arg');

    var ddpClient = operand.ddpClient;
    var closure   = operand.closure;

    callDDPMethod(ddpClient, '/gagarin/wait', [ closure(), timeout, message, code.toString(), args ], closure, cb);

  });
}

function callDDPMethod (ddpClient, name, args, closure, cb) {
  "use strict";

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
    if (!feedback) {
      return cb(new Error('no feedback provided'));
    }
    if (feedback.error) {
      return cb(new Error(feedback.error));
    }
    cb(null, feedback.value);
  });
}

function warning (name, signature) {
  "use strict";

  console.warn('\n  meteor.' + name + '(' + signature + ') is now deprecated; please use a list of arguments as the last parameter\n');
}
