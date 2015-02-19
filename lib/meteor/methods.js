
var chalk                = require('chalk');
var createFeedbackServer = require('./feedbackServer');

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

    callDDPMethod(ddpClient, '/gagarin/promise', [ closure(), code.toString(), clean(args) ], closure, cb);

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

    callDDPMethod(ddpClient, '/gagarin/execute', [ closure(), code.toString(), clean(args) ], closure, cb);

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

    callDDPMethod(ddpClient, '/gagarin/wait', [ closure(), timeout, message, code.toString(), clean(args) ], closure, cb);

  });
}

module.exports.mocha = function () {

  var port     = 0;
  var stats    = {};
  var server   = null;
  var hasEnded = false;

  return this.getFreePort().__custom__(function (operand, done) {

    port = this.lastResult;

    server = createFeedbackServer(port, done).onFeedback(function (what, data) {

      if (what === 'pass') {
        process.stdout.write(data.speed === 'fast' ? chalk.green('.') : chalk.yellow('.'));

      } else if (what === 'fail') {
        process.stdout.write(chalk.red('.'));

      } else if (what === 'end') {
        stats = data;
        if (typeof hasEnded === 'function') {
          hasEnded();
        } else {
          hasEnded = true;
        }
      }      
    });

  }).execute(function (port) {

    Gagarin.connection = DDP.connect('http://localhost:' + port);

  }, [ function () { return port; } ]).wait(1000, 'until status is connected', function () {

    return Gagarin.connection.status().connected;

  }).execute(function () {

    if (!Gagarin.mocha) {
      throw new Error('first, you need to make sure mocha is initialized');
    }

    Gagarin.mocha.setFeedbackFunction(Meteor.bindEnvironment(function (what, data) {
      Gagarin.connection.call('/gagarin/feedback', what, data);
    }));

  }).promise(function (resolve, reject) {

    Gagarin.mocha.run(function () {
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

    server.close();

    if (stats.failures) {
      // TODO: provide more details
      done(new Error('Mocha test suite failed with the following feedback:\n\n' + indent(stats.message, 3)));
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

function clean(args) {
  return args.map(function (value) {
    return typeof value === 'function' ? value() : value;
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
