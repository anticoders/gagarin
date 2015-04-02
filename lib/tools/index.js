var portscanner = require('portscanner');
var Promise = require('es6-promise').Promise;
var Fiber = require('fibers');
var spawn = require('child_process').spawn;
var path = require('path');
var chalk = require('chalk');
var fs = require('fs');
var _ = require('lodash');

module.exports = {

  getReleaseName: _.memoize(function (pathToApp) {
    "use strict";
    var pathToRelease = path.join(pathToApp, '.meteor', 'release');
    return new Promise(function (resolve, reject) {
      fs.readFile(pathToRelease, { encoding: 'utf8' }, function (err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data.replace(/\s/g, ''));
      });
    });
  }),

  // TODO: refactor to "getMeteorReleaseVersion"
  getReleaseVersion: _.memoize(function (pathToApp) {
    "use strict";
    return module.exports.getReleaseName(pathToApp).then(function (releaseName) {
      return parseRelease(releaseName);
    });
  }),

  getBuildArtifact: _.memoize(function (pathToApp) {
    "use strict";
    var pathToBuildArtifact = path.join(pathToApp, '.gagarin', 'local', 'artifacts.json');
    return new Promise(function (resolve, reject) {
      fs.readFile(pathToBuildArtifact, { encoding: 'utf8' }, function (err, data) {
        if (err) {
          if (err.code === 'ENOENT') {
            err = new Error('The file ".gagarin/artifacts.json" does not exist! '
               + 'This may be caused by several things:\n'
               + '\t(1) your app does not build properly,\n'
               + '\t(2) you forgot to add anti:gagarin to your app,\n'
               + '\t(3) anti:gagarin is at version < 0.4.6.\n');
          }
          return reject(err);
        }
        resolve(JSON.parse(data));
      });
    });
  }),

  getPathToDevBundle: _.memoize(function (pathToApp) {
    "use strict";
    return module.exports.getBuildArtifact(pathToApp)
      .then(function (artifact) {
        return artifact.pathToDevBundle;
      });
  }),

  getReleaseConfig: _.memoize(function (version) {
    "use strict";

    var pathToReleaseConfig = path.join(
      module.exports.getUserHome(), '.meteor', 'releases', version + '.release.json');
    //--------------------------------------------------------------------------------
    return new Promise(function (resolve, reject) {
      fs.readFile(pathToReleaseConfig, { encoding: 'utf8' }, function (err, data) {
        if (err) {
          return reject(err);
        }
        resolve(JSON.parse(data));
      });
    });
  }),

  getMongoPath: _.memoize(function (pathToApp) {
    "use strict";
    return module.exports.getPathToDevBundle(pathToApp)
      .then(function (pathToDevBundle) {
        return path.join(pathToDevBundle,  'mongodb', 'bin', 'mongod');
      });
  }),

  getNodePath: _.memoize(function (pathToApp) {
    "use strict";
    return module.exports.getPathToDevBundle(pathToApp)
      .then(function (pathToDevBundle) {
        return path.join(pathToDevBundle, 'bin', 'node');
      });
  }),

  getNpmPath: _.memoize(function (pathToApp) {
    "use strict";
    return module.exports.getPathToDevBundle(pathToApp)
      .then(function (pathToDevBundle) {
        return path.join(pathToDevBundle, 'bin', 'npm');
      });
  }),

  getUserHome: function () {
    "use strict";

    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  },

  getPathToDB: function (pathToApp) {
    "use strict";

    return path.join(pathToApp || module.exports.getUserHome(), '.gagarin', 'local', 'db');
  },

  getPathToGitIgnore: function (pathToApp) {
    "use strict";

    return path.join(pathToApp || module.exports.getUserHome(), '.gagarin', '.gitignore');
  },

  either: function (first) {
    "use strict";

    return {
      or: function (second) {
        return function (arg1, arg2) {
          return arg1 ? first(arg1) : second(arg2);
        };
      }
    };
  },

  firstArgNull: function (callback) {
    "use strict";

    return function (value) {
      callback(null, value);
    }
  },

  exitAsPromise: function (otherProcess) {
    "use strict";

    return new Promise(function (resolve, reject) {
      otherProcess.once('error', reject);
      otherProcess.once('exit', resolve);
      otherProcess.kill();
    });
  },

  smartPackagesAsPromise: function (pathToApp) {
    "use strict";

    console.log(
    
    chalk.yellow(module.exports.banner([
      'we have detected a smart.json file in ' + pathToApp,
      'since Gagarin no longer supports meteorite, this file will be ignored',
    ].join('\n'), {}))

    );

    console.log(); // one more empty line

    return Promise.resolve();

    /*
    return new Promise(function (resolve, reject) {
      var meteorite;
      var exec = require('child_process').exec;
      exec('mrt --version', function (err) {
        if (err) {
          reject('meteorite not found! please install it with: npm install -g meteorite,' +
                 ' or make sure your project does not contain smart.json file');
          return;
        }
        try {
          meteorite = spawn('mrt', [ 'install' ], { cwd: pathToApp });
        } catch (err) {
          return reject(err);
        }
        meteorite.on('exit', module.exports.either(function (code) {
          reject(new Error('Bad luck, meteorite exited with code: ' + code));
        }).or(resolve));
      });
    });
    */
  },

  /**
   * Make an error comming from webdriver a little more readable.
   */
  cleanError: function (err) {
    "use strict";

    var message = '';

    if (typeof err === 'string') {
      return new Error(err);

    } else if (typeof err === 'object') {

      if (err.cause) {
        // probably a webdriver error
        try {
          message = JSON.parse(err.cause.value.message).errorMessage;
        } catch ($) {
          message = err.cause.value.message;
        }
      } else {
        message = err.message || err.toString();
      }
      return new Error(message);
    }
    return new Error(err.toString());
  },

  mergeHelpers: function (helpers, moreHelpers) {
    "use strict";

    helpers = helpers || {};

    if (moreHelpers) {
      if (!Array.isArray(moreHelpers)) {
        moreHelpers = [ moreHelpers ];
      }
      moreHelpers.forEach(function (helpersToAdd) {
        if (!helpersToAdd || !typeof helpersToAdd === 'object') {
          return;
        }
        Object.keys(helpersToAdd).forEach(function (key) {
          if (helpers[key] !== undefined) {
            console.warn('helper ' + key + ' conflicts with some other method');
          }
          helpers[key] = helpersToAdd[key];
        });
      });
    }
    return helpers;
  },

  getSettings: function (settings) {
    "use strict";

    var content;

    if (!settings) {
      return;
    }

    if (typeof settings === 'object') {
      return settings;
    }

    if (typeof settings !== 'string') {
      logError('settings should be either object or path to a file');
      return;
    }

    try {
      content = fs.readFileSync(settings);
    } catch (err) {
      logError('error while reading file ' + settings, err);
      return;
    }
    try {
      return JSON.parse(content);
    } catch (err) {
      logError('error while parsing settings file', err);
    }
  },

  /**
   * Make a version of function that can only be called once.
   */
  once: function (cb) {
    var done = false;
    return function () {
      if (done) {
        return;
      }
      done = true;
      return cb.apply(this, arguments);
    }
  },

  /**
   * Find a port, nobody is listening on.
   */
  findAvailablePort: function () {

    return new Promise(function (resolve, reject) {
      var numberOfRetries = 5;

      (function retry () {
        var port = 4000 + Math.floor(Math.random() * 1000);
        portscanner.checkPortStatus(port, 'localhost', function (err, status) {
          if (err || status !== 'closed') {
            if (--numberOfRetries > 0) {
              setTimeout(retry);
            } else {
              reject('Cannot find a free port... giving up');
            }
          } else {
            resolve(port);
          }
        });
      })();
    });
  },

  stack: function () {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  },

  /**
   * Creates a nice banner containing the given text.
   *
   * @param {object} options
   */
  banner: function (text, options) {
    
    var marginX     = options.marginX !== undefined ? options.marginX : 2;
    var marginY     = options.marginY !== undefined ? options.marginY : 1;
    var margin      = new Array(marginX+1).join(" ");
    var indent      = options.indent !== undefined ? options.indent :  "  ";
    var maxLength   = 0;
    var linesOfText = text.split('\n');

    var pattern = options.pattern || {
      T: "/", B: "/", TR: "//", BR: "//", TL: "//", BL: "//", R: "//", L: "//"
    };

    linesOfText.forEach(function (line) {
      maxLength = Math.max(maxLength, line.length);
    });

    var top    = pattern.TL + new Array(2 * marginX + maxLength + 1).join(pattern.T) + pattern.TR;
    var empty  = pattern.L  + new Array(2 * marginX + maxLength + 1).join(" ")       + pattern.R;
    var bottom = pattern.BL + new Array(2 * marginX + maxLength + 1).join(pattern.B) + pattern.BR;

    linesOfText = linesOfText.map(function (line) {
      while (line.length < maxLength) {
        line += " ";
      }
      return pattern.L + margin + line + margin + pattern.R;
    });

    // vertical margin
    for (var i=0; i<marginY; i++) {
      linesOfText.unshift(empty);
      linesOfText.push(empty);
    }

    // top and bottom lines
    linesOfText.unshift(top);
    linesOfText.push(bottom);

    return linesOfText.map(function (line) {
      return indent + line;
    }).join('\n');
  }

};

// since 0.9.0, the format is METEOR@x.x.x
function parseRelease(release) {
  "use strict";

  return release.split('@')[1] || release;
}

function initial(array) {
  "use strict";

  return array.slice(0, array.length - 1);
}

function logError(context, error) {
  "use strict";

  console.warn(chalk.inverse('[gagarin] ' + context));
  console.warn(chalk.yellow(err.stack));
}

