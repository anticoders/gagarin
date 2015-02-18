
var chalk = require('chalk');

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

  var stats    = {};
  var subId    = null;
  var observer = null;
  var hasEnded = false;

  return this.__custom__(function (operand, done) {

    subId    = operand.ddpClient.subscribe('/gagarin/reports', [], done);
    observer = operand.ddpClient.observe("gagarin_reports");

    observer.added = function (id) {
      var report = operand.ddpClient.collections.gagarin_reports[id];
      
      if (report.what === 'pass') {
        process.stdout.write(report.speed === 'fast' ? chalk.green('.') : chalk.yellow('.'));

      } else if (report.what === 'fail') {
        process.stdout.write(chalk.red('.'));

      } else if (report.what === 'end') {
        //process.stdout.write('\n');
        //-------------------------
        stats = report;
        //-----------------------------------
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

    if (stats.failures) {
      // TODO: provide more details
      done(new Error('Mocha test suite faild with the following feedback:\n\n' + indent(stats.message, 3)));
    } else {
      done();
    }

  });
}

function indent(text, size) {
  var space = new Array(size+1).join(' ');
  return text.split('\n').map(function (line) {
    return space + line;
  }).join('\n');
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
