var parseBuildErrors     = require('./parseBuildErrors');
var linkNodeModules      = require('./linkNodeModules');
var Promise              = require('es6-promise').Promise;
var chalk                = require('chalk');
var spawn                = require('child_process').spawn;
var tools                = require('../tools');
var path                 = require('path');
var fs                   = require('fs');
var pty                  = require('pty.js');

var memoize = {};

module.exports = function Build (options) {
  "use strict";
  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');
  var timeout   = options.timeout   || 120000;
  var verbose   = options.verbose !== undefined ? !!options.verbose : false;

  var pathToSmartJson = path.join(pathToApp, 'smart.json');
  var pathToMain      = path.join(pathToApp, '.meteor', 'local', 'build', 'main.js');
  var pathToMain2     = path.join(pathToApp, '.gagarin', 'local', 'bundle', 'main.js');
  var skipBuild       = !!options.skipBuild;

  function systemLog(text) {
    if (!verbose) {
      return;
    }
    process.stdout.write(chalk.cyan('[system] ') + text + '\n');
  }

  this.start = function start () {

    // TODO: in the future, we will also want to cache
    //       w/r/t build options (e.g. production/debug)

    if (memoize[pathToApp]) {
      return memoize[pathToApp];
    }

    memoize[pathToApp] = new Promise(function (resolve, reject) {

      checkIfMeteorIsRunning(pathToApp).then(function (isRunning) {

        if (isRunning) {
          if (!fs.existsSync(pathToMain)) {
            throw new Error("Even though meteor seems to be running, the file " +
               "'.meteor/local/build/main.js' does not exist. Either, there is a stale mongod process, " +
                "or you just need to remove '.meteor/local/db/mongo.lock' manually.");
          }
          systemLog('using ' + pathToMain);
          return pathToMain
        }

        if (skipBuild) {
          // first, try using the previous build ...
          if (fs.existsSync(pathToMain2)) {
            systemLog('using ' + pathToMain2);
            return pathToMain2;
          } else { // as a fallback solution try using main.js from develop mode
            if (fs.existsSync(pathToMain)) {
              systemLog('using ' + pathToMain);
              return pathToMain;
            }
            throw new Error('There is no build available, so you cannot "skip build".');
          }
        }

        return smartJsonWarning(pathToApp).then(function () {
          // finally run the builder ...

          systemLog('running meteor build at ' + pathToApp);

          return BuildPromise({
            pathToApp : pathToApp,
            verbose   : verbose,
            timeout   : timeout
          });
        });

      }).then(resolve, reject);

    });

    return memoize[pathToApp];

  }; // start
};

// PRIVATE BUILD PROMISE IMPLEMENTATION

function BuildPromise(options) {
  "use strict";

  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');
  var mongoUrl  = options.mongoUrl  || "http://localhost:27017";
  var timeout   = options.timeout   || 120000;
  var verbose   = options.verbose !== undefined ? !!options.verbose : false;

  var pathToMain  = path.join(pathToApp, '.gagarin', 'local', 'bundle', 'main.js');
  var pathToLocal = path.join(pathToApp, '.gagarin', 'local');

  var env = Object.create(process.env);

  var spawnMe = verbose ? pty.spawn : spawn;

  function systemLog(text) {
    if (!verbose) {
      return;
    }
    process.stdout.write(chalk.cyan('[system] ') + text + '\n');
  }

  return tools.getReleaseVersion(pathToApp).then(function (version) { return new Promise(function (resolve, reject) {

    var args;

    systemLog("detected METEOR@" + version);

    if (version >= '1.0.0') {
      args = [ 'build', '--debug', '--directory', pathToLocal ];
    } else {
      args = [ 'bundle', '--debug', '--directory', path.join(pathToLocal, 'bundle') ];
    }

    systemLog("spawning meteor process with the following args");
    systemLog(JSON.stringify(args));

    var meteor = spawnMe('meteor', args, { cwd: pathToApp, env: env });
    var output = "";

    meteor.on('exit', function onExit (code) {

      var err = parseBuildErrors(output);

      if (err) {
        return reject(err);
      }

      systemLog('linking node_modules');

      linkNodeModules(pathToApp).then(function () {

        systemLog('everything is fine');

        resolve(pathToMain);
      }).catch(reject);

    });

    //-----------------------------------------------
    meteor.stdout.on('data', function onData (data) {

      output += data.toString();

      if (data.toString().match(/WARNING: The output directory is under your source tree./)) {
        logMeteorOutput('  creating your test build in ' + path.join(pathToLocal, 'bundle') + '\n');
        return;
      }
      logMeteorOutput(data);
    });

    meteor.stdout.on('error', function onError (data) {
      console.log(chalk.red(data.toString()));
    });

    setTimeout(function () {
      meteor.once('exit', function () {
        reject(new Error('Timeout while waiting for meteor build to finish.'));
      });
      meteor.kill('SIGINT')
    }, timeout);

  }); }); 

  function logMeteorOutput(data) {
    if (!verbose) {
      return;
    }
    process.stdout.write(chalk.gray(chalk.stripColor(data)));
  }

} // Build

/**
 * Guess if "develop" meteor is currently running.
 *
 * @param {string} pathToApp
 */
function checkIfMeteorIsRunning(pathToApp) {
  var pathToMongoLock = path.join(pathToApp, '.meteor', 'local', 'db', 'mongod.lock');
  return new Promise(function (resolve, reject) {
    fs.readFile(pathToMongoLock, { encoding: 'utf8' }, function (err, data) {
      if (err) {
        // if the file does not exist, then we are ok anyway
        return err.code !== 'ENOENT' ? reject(err) : resolve();
      } else {
        // isLocked iff the content is non empty
        resolve(!!data);
      }
    });
  });
}

/**
 * Look for "smart.json" file. If there's one, print warning
 * before resolving.
 *
 * @param {string} pathToApp
 */
function smartJsonWarning(pathToApp) {
  var pathToSmartJSON = path.join(pathToApp, 'smart.json');
  return new Promise(function (resolve, reject) {
    fs.readFile(pathToSmartJSON, { endcoding: 'urf8' }, function (err, data) {
      if (err) {
        // if the file does not exist, then we are ok anyway
        return err.code !== 'ENOENT' ? reject(err) : resolve();
      } else {
        // since the file exists, first print a warning, then resolve ...
        chalk.yellow(
          tools.banner([
            'we have detected a smart.json file in ' + pathToApp,
            'since Gagarin no longer supports meteorite, this file will be ignored',
          ].join('\n'), {})
        );
        process.stdout.write('\n');
        resolve();
      }
    });
  });
}
