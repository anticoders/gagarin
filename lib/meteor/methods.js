
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
    var context   = this;

    callDDPMethod(ddpClient, '/gagarin/promise', [ context, closure(), code.toString(), args ], getSetter(context), closure, cb);

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
    var context   = this;

    callDDPMethod(ddpClient, '/gagarin/execute', [ context, closure(), code.toString(), args ], getSetter(context), closure, cb);

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
    var context   = this;

    callDDPMethod(ddpClient, '/gagarin/wait', [ context, closure(), timeout, message, code.toString(), args ], getSetter(context), closure, cb);

  });
}

function callDDPMethod (ddpClient, name, args, context, closure, cb) {
  "use strict";

  if (!ddpClient) {
    return cb(new Error('invalid ddpClient'));
  }
  ddpClient.call(name, args, function (err, feedback) {
    if (feedback && feedback.closure) {
      closure(feedback.closure);
    }
    if (feedback && feedback.context) {
      context(feedback.context);
    }
    if (err) {
      return cb(err);
    }
    if (!feedback) {
      return cb(new Error('no feedback provided'));
    }
    if (feedback.error !== undefined) {
      return cb(new Error(feedback.error || 'Empty feedback error'));
    }
    cb(null, feedback.value);
  });
}

function getSetter(object) {
  "use strict";

  return function setter (updates) {
    Object.keys(updates).forEach(function (key) {
      object[key] = updates[key];
    });
  }
}

function warning (name, signature) {
  "use strict";

  console.warn('\n  meteor.' + name + '(' + signature + ') is now deprecated; please use a list of arguments as the last parameter\n');
}
