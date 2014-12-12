var spawn = require('child_process').spawn;

module.exports = function Instance(node, main, env, options) {
  
  var meteor      = null;
  var lastError   = "";
  var lastErrorAt = "nowhere";

  setTimeout(function () {
    try {
      meteor = spawn(node, [ main ], { env: env });
    } catch (err) {
      return options.onSpawn && options.onSpawn(err);
    }

    meteor.stdout.on('data', function (data) {
      var match = /Поехали!/.exec(data.toString());
      if (match) {
        options.onSpawn && options.onSpawn();
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
      if (options.onExit) {
        options.onExit(code, lastError, lastErrorAt);
      }
      meteor = null;
    });

  });

  this.kill = function (cb) {
    if (!meteor) {
      return cb();
    }
    meteor.once('exit', function (code) {
      if (code === 0 || code === 130) {
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
