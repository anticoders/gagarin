var spawn = require('child_process').spawn;

/**
 * Creates a smart meteor instance, suitable for usage with the testing framework.
 *
 * @param {String} node - path to node executable
 * @param {String} main - path to applciation main
 * @param {Object} env  - environment variables for the new process
 * @param {Object} options
 *
 * Available options are:
 * - onStart {Function}
 * - onExit  {Function}
 * - safetyTimeout {Number}
 */
module.exports = function Instance (node, main, env, options) {
  "use strict";
  
  var meteor        = null;
  var lastError     = "";
  var lastErrorAt   = "nowhere";
  var safetyTimeout = options.safetyTimeout || 5 * 1000;
  var safetyHandle  = null;

  setTimeout(function () {
    try {
      meteor = spawn(node, [ main ], { env: env });
    } catch (err) {
      return options.onStart && options.onStart(err);
    }

    safetyHandle = setTimeout(function () {
      kill(function (err) {
        if (options.onStart) {
          if (err) {
            options.onStart(err);
          } else {
            options.onStart(new Error('Gagarin is not there.' +
              ' Please make sure you have added it with: meteor add anti:gagarin.'));
          }
        }
      });
    }, safetyTimeout);

    meteor.stdout.on('data', function (data) {
      //process.stdout.write(data);
      var match = /Поехали!/.exec(data.toString());
      if (match) {
        clearTimeout(safetyHandle);
        //-----------------------------------
        options.onStart && options.onStart();
      }
    });

    // make sure we kill meteor on process exit
    process.once('exit', onProcessExit);

    meteor.stderr.on('data', function (data) { // look for errors
      data.toString().split('\n').forEach(function (line) {
        var hasMatch = [
          {
            regExp: /Error\:\s*(.*)/,
            action: function (match) {
              lastError   = match[1];
              lastErrorAt = '';
            },
          },
          {
            regExp: /at\s.*/,
            action: function (match) {
              if (!lastErrorAt) {
                lastErrorAt = match[0];
              }
            },
          },
        ].some(function (options) {
          var match = options.regExp.exec(line);
          if (match) {
            options.action.call(null, match);
            return true;
          }
        });
        if (lastError && !hasMatch) {
          lastError += '\n' + line;
        }
      });
    });

    meteor.on('exit', function (code) {
      clearTimeout(safetyHandle);
      //-------------------------
      if (options.onExit) {
        options.onExit(code, lastError, lastErrorAt);
      }
      meteor = null;
    });

  });

  this.kill = kill;
  /**
   * Kill the meteor process and cleanup.
   *
   * @param {Function} cb
   */
  function kill (cb) {
    if (!meteor) {
      return cb();
    }
    meteor.once('exit', function (code) {
      if (!code || code === 0 || code === 130) {
        cb();
      } else {
        cb(new Error('exited with code ' + code));
      }
    });
    meteor.kill('SIGINT');
    meteor = null;
    //--------------------------------------------
    process.removeListener('exit', onProcessExit);
  }

  function onProcessExit() {
    meteor && meteor.kill();
    meteor = null;
  }

}
