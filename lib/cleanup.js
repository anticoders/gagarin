
var Promise = require('es6-promise').Promise;
var chalk = require('chalk');
var Base = require('mocha').reporters.Base;
var logs = require('./logs');
var _ = require('lodash');

var verbose = true;
var listOfAllTasks = [];

exports.setVerbose = function (value) {
  verbose = !!value;
}

exports.addTask = function (action) {
  "use strict";
  if (typeof action !== 'function') {
    throw new TypeError("argument 'action' must be a function");
  }
  var task = { action : action, promise: null };

  listOfAllTasks.push(task);

  var runner = function taskRunner (args, cb) {
    if (arguments.length < 2) {
      cb = args; args = [];
    }
    if (typeof cb !== 'function' && cb !== undefined) {
      throw new TypeError("argument 'cb' must be a function");
    }
    if (!Array.isArray(args)) {
      throw new TypeError("argument 'args' must be an array");
    }
    var context = {
      describe: function (text) {
        logs.system(text);
      }
    }
    return runTask(context, task, args, cb);
  }

  runner.cancel = function () {
    if (!task.promise) {
      task.promise = Promise.resolve();
    }
  }

  return runner;
}

function runTask (context, task, args, cb) {
  if (!task.promise) {
    task.promise = new Promise(function (resolve, reject) {
      var copy = args.slice(0);
      copy.push(function (err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
      task.action.apply(context, copy);
    });
  }
  if (cb) {
    task.promise.then(_.partial(cb, null), cb);
  } else {
    return task.promise;
  }
}

function makeContextManager (verbose) {
  var manager    = {};

  manager.context = function () {
    var context = { __logs__: [] };
    context.describe = function (text) {
      context.__logs__.push(text);
    }
    return context;
  }

  manager.done = function (context, err) {
    var hasErrors = !!err;
    context.__logs__.forEach(function (text) {
      if (!verbose) {
        return;
      }
      if (hasErrors) {
        process.stdout.write(
          indent(text, "    ", "  " + chalk.red(Base.symbols.err) + " ", chalk.gray) + "\n"
        );
      } else {
        process.stdout.write(
          indent(text, "    ", "  " + chalk.green(Base.symbols.ok) + " ", chalk.gray) + "\n"
        );
      }
    });
  }

  return manager;
}

process.on('cleanup', function () {

  var manager = makeContextManager(verbose);

  process.stdout.write(chalk.green('\n  cleaning up ...\n\n'));

  (function next() {

    if (listOfAllTasks.length === 0) {
      if (verbose) {
        process.stdout.write('\n');
      }
      process.emit('clean');
      return;
    }

    var task    = listOfAllTasks.pop();
    var context = manager.context();

    runTask(context, task, [], function (err) {
      manager.done(context, err);
      next();
    });

  })();

});

// catch ctrl+c event and cleanup
process.on('SIGINT', function () {
  process.emit('cleanup');
  process.once('clean', function () {
    process.exit(1);
  });
});

// catch uncaught exceptions, clean
// process.on('uncaughtException', function() {
//   process.emit('cleanup');
// });

function indent(text, margin, first, transform) {
  return text.split('\n').map(function (line, index) {
    if (index === 0 && first) {
      return first + (transform ? transform(line) : line);
    }
    return margin + (transform ? transform(line) : line);
  }).join('\n');
}
