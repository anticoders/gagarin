var portscanner = require('portscanner');
var Promise = require('es6-promise').Promise;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

module.exports = {

  getReleaseConfig: function (pathToApp) {
    "use strict";

    var pathToRelease = path.join(pathToApp, '.meteor', 'release'), release = 'latest';
    if (fs.existsSync(pathToRelease)) {
      release = parseRelease(fs.readFileSync(pathToRelease).toString('utf8').replace(/\s/g, ''));
    }
    var pathToReleaseConfig = path.join(
      module.exports.getUserHome(), '.meteor', 'releases', release + '.release.json');
    //--------------------------------------------------------------------------------
    var config = { tools: 'latest' };
    if (fs.existsSync(pathToReleaseConfig)) {
      config = JSON.parse(fs.readFileSync(pathToReleaseConfig).toString('utf8'));
    }
    config.release = release;
    return config;
  },

  getUserHome: function () {
    "use strict";

    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  },

  getMongoPath: function (pathToApp) {
    "use strict";

    var config = module.exports.getReleaseConfig(pathToApp);
    var home = module.exports.getUserHome();
    if (config.release < "0.9.0") {
      return path.join(home, '.meteor', 'tools', config.tools, 'mongodb', 'bin', 'mongod');
    }
    var pathToMeteor = path.join(home, '.meteor');
    var meteorSymLink = path.join(pathToMeteor, fs.readlinkSync(path.join(pathToMeteor, 'meteor')));
    return '/' + path.join.apply(path, initial(meteorSymLink.split(path.sep)).concat([
      'dev_bundle', 'mongodb', 'bin', 'mongod'
    ]));
  },

  getNodePath: function (pathToApp) {
    "use strict";

    var config = module.exports.getReleaseConfig(pathToApp);
    var home = module.exports.getUserHome();
    if (config.release < "0.9.0") {
      return path.join(home, '.meteor', 'tools', config.tools, 'bin', 'node');
    }
    var pathToMeteor = path.join(home, '.meteor');
    var meteorSymLink = path.join(pathToMeteor, fs.readlinkSync(path.join(pathToMeteor, 'meteor')));
    return '/' + path.join.apply(path, initial(meteorSymLink.split(path.sep)).concat([
      'dev_bundle', 'bin', 'node'
    ]));
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

    return new Promise(function (resolve, reject) {
      var meteorite;
      var exec = require('child_process').exec;
      exec('mrt --version',function(err){
        if(err) reject('Meteorite not found, please install it npm install -g meteorite');
        try {
          meteorite = spawn('mrt', [ 'install' ], { cwd: pathToApp });
        } catch (err) {

          return reject(err);
        }

        meteorite.on('exit', module.exports.either(function (code) {
          reject(new Error('Bad luck, meteorite exited with code: ' + code));
        }).or(resolve));        
      });


      // TODO: timeout

    });
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
