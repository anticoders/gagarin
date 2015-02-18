
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

module.exports.runMocha = function () {
  var subId    = null;
  var observer = null;
  var hasEnded = false;

  return this.__custom__(function (operand, done) {

    subId    = operand.ddpClient.subscribe('/gagarin/reports', [], done);
    observer = operand.ddpClient.observe("gagarin_reports");

    observer.added = function (id) {
      var reports = operand.ddpClient.collections.gagarin_reports;
      //console.log('added', reports[id]);
      if (reports[id].what === 'end') {
        if (typeof hasEnded === 'function') {
          hasEnded();
        } else {
          hasEnded = true;
        }
      }
    }

  }).promise(function (resolve, reject) {
    if (!Gagarin._runMocha) {
      throw new Error('first, you need to make sure mocha is initialized');
    }
    Gagarin._runMocha(function () {
      resolve();
    });
  }).__custom__(function (operand, done) {
    if (hasEnded) {
      done();
    } else {
      hasEnded = function (err) {
        done(err);
      }
    }    
  }).__custom__(function (operand, done) {
    operand.ddpClient.unsubscribe(subId);
    observer.stop();
    done();
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
