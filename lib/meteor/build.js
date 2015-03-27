var parseBuildErrors     = require('./parseBuildErrors');
var linkNodeModules      = require('./linkNodeModules');
var Promise              = require('es6-promise').Promise;
var chalk                = require('chalk');
var spawn                = require('child_process').spawn;
var tools                = require('../tools');
var path                 = require('path');
var fs                   = require('fs');
var version              = require('../../package.json').version;
var pty                  = require('pty.js');

var myBuildPromises = {};

module.exports = function BuildAsPromise (options) {
  "use strict";
  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');
  var timeout   = options.timeout   || 120000;
  var verbose   = options.verbose !== undefined ? !!options.verbose : false;

  var pathToSmartJson = path.join(pathToApp, 'smart.json');
  var pathToMain      = path.join(pathToApp, '.meteor', 'local', 'build', 'main.js');
  var skipBuild       = !!options.skipBuild;

  if (skipBuild) {
    if (fs.existsSync(pathToMain)) {
      return Promise.resolve(pathToMain);
    } else {
      return Promise.reject(new Error('File: ' + pathToMain + ' does not exist.'));
    }
  }

  if (myBuildPromises[pathToApp]) return myBuildPromises[pathToApp];

  var smartPackagesOrNothing = fs.existsSync(pathToSmartJson) ?
    tools.smartPackagesAsPromise(pathToApp) : Promise.resolve();

  myBuildPromises[pathToApp] = smartPackagesOrNothing.then(function () {
    
    return BuildPromise({
      pathToApp : pathToApp,
      verbose   : verbose,
      timeout   : timeout
    });
    
  });

  return myBuildPromises[pathToApp];
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

  return tools.getReleaseVersion(pathToApp).then(function (version) { return new Promise(function (resolve, reject) {

    var args;

    if (version >= '1.0.0') {
      args = [ 'build', '--debug', '--directory', pathToLocal ];
    } else {
      args = [ 'bundle', '--debug', '--directory', path.join(pathToLocal, 'bundle') ];
    }

    var meteor = spawnMe('meteor', args, { cwd: pathToApp, env: env });
    var output = "";

    meteor.on('exit', function (code) {

      var err = parseBuildErrors(output);

      if (err) {
        return reject(err);
      }

      linkNodeModules(pathToApp).then(function () {
        resolve(pathToMain);
      }).catch(reject);

    });

    //----------------------------------------
    meteor.stdout.on('data', function (data) {

      output += data.toString();

      if (data.toString().match(/WARNING: The output directory is under your source tree./)) {
        logMeteorOutput('  created your test build in ' + path.join(pathToLocal, 'bundle') + '\n');
        return;
      }
      logMeteorOutput(data);
    });

    meteor.stdout.on('error', function (data) {
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

} // BuildPromise

/**
 * Guess if meteor is currently running.
 */
function isLocked(pathToApp) {
  var pathToMongoLock = path.join(pathToApp, '.meteor', 'local', 'db', 'mongod.lock');
  return fs.existsSync(pathToMongoLock) && fs.readFileSync(pathToMongoLock).toString('utf8');
}

