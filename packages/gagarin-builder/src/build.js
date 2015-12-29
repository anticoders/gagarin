import * as common from 'gagarin-common';
import * as fs from 'fs';
import {spawn} from 'child_process';
import {resolve as pathResolve, join as pathJoin} from 'path';
import parseBuildErrors from 'parseBuildErrors';
import linkNodeModules from 'linkNodeModules';

// var logs                 = require('../logs');

var memoize = {};

export default function Build (options) {
  "use strict";
  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');

  // it has to be absolute because we are going to use it as cwd
  // for meteor build in a moment ...
  pathToApp = path.resolve(pathToApp);

  var timeout   = options.timeout   || 120000;
  var verbose   = options.verbose !== undefined ? !!options.verbose : false;

  if (logs.isSilentBuild()) {
    // the global settings get precedence here
    verbose = false;
  }

  var pathToSmartJson = path.join(pathToApp, 'smart.json');
  var pathToMain      = path.join(pathToApp, '.meteor', 'local', 'build', 'main.js');
  var pathToMain2     = path.join(pathToApp, '.gagarin', 'local', 'bundle', 'main.js');
  var skipBuild       = !!options.skipBuild;

  this.start = function start () {

    // TODO: in the future, we will also want to cache
    //       w/r/t build options (e.g. production/debug)

    if (memoize[pathToApp]) {
      return memoize[pathToApp];
    }

    memoize[pathToApp] = new Promise(function (resolve, reject) {

      tools.checkMeteorIsRunning(pathToApp).then(function (isRunning) {

        if (isRunning) {
          if (!fs.existsSync(pathToMain)) {
            throw new Error("Even though meteor seems to be running, the file " +
               "'.meteor/local/build/main.js' does not exist. Either, there is a stale mongod process, " +
                "or you just need to remove '.meteor/local/db/mongo.lock' manually.");
          }
          logs.system('using ' + pathToMain);
          return pathToMain
        }

        if (skipBuild) {
          // first, try using the previous build ...
          if (fs.existsSync(pathToMain2)) {
            logs.system('using ' + pathToMain2);
            return pathToMain2;
          } else { // as a fallback solution try using main.js from develop mode
            if (fs.existsSync(pathToMain)) {
              logs.system('using ' + pathToMain);
              return pathToMain;
            }
            throw new Error('There is no build available, so you cannot "skip build".');
          }
        }

        return smartJsonWarning(pathToApp).then(function () {
          // finally run the builder ...

          logs.system('running meteor build at ' + pathToApp);

          return ensureGagarinVersionsMatch(pathToApp, verbose).then(function () {

            return BuildPromise({
              pathToApp : pathToApp,
              verbose   : verbose,
              timeout   : timeout
            });

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

  return common.getMeteorVersion(pathToApp).then(function (version) { return new Promise(function (resolve, reject) {

    var args;

    logs.system("detected METEOR@" + version);

    if (version >= '1.0.0') {
      args = [ 'build', '--debug', '--directory', pathToLocal ];
    } else {
      args = [ 'bundle', '--debug', '--directory', path.join(pathToLocal, 'bundle') ];
    }

    logs.system("spawning meteor process with the following args");
    logs.system(JSON.stringify(args));

    var buildTimeout = null;

    // NOTE: this is a Promise
    var meteorBinary = common.getMeteorBinary();
    //make sure that platforms file contains only server and browser
    //and cache this file under platforms.gagarin.backup
    var platformsFilePath = path.join(pathToApp,'.meteor','platforms');
    var platformsBackupPath = path.join(pathToApp,'.meteor','platforms.gagarin.backup');

    fs.rename(platformsFilePath,platformsBackupPath,function(err,data){
      fs.writeFile(platformsFilePath,'server\nbrowser\n',function(){
        spawnMeteorProcess();
      });
    });

    var output = "";

    var meteor = null;

    var spawnMeteorProcess = function(){

      meteor = spawn(meteorBinary, args, {
        cwd: pathToApp, env: env, stdio: verbose ? 'inherit' : 'ignore'
      });

      meteor.on('exit', function onExit (code) {
        //switch back to initial content of platforms file
        fs.rename(platformsBackupPath,platformsFilePath);
        if (code) {
          return reject(new Error('meteor build exited with code ' + code));
        }

        /*
        var err = parseBuildErrors(output);

        if (err) {
          return reject(err);
        }
        */

        logs.system('linking node_modules');

        linkNodeModules(pathToApp).then(function () {

          logs.system('everything is fine');

          resolve(pathToMain);
        }).catch(reject);


        buildTimeout = setTimeout(function () {
          meteor.once('exit', function () {
            reject(new Error('Timeout while waiting for meteor build to finish.'));
          });
          meteor.kill('SIGINT')
        }, timeout);

        clearTimeout(buildTimeout);

      });
    }

  }); });

} // Build


/**
 * Check smart package version and if it's wrong, install the right one.
 *
 * @param {string} pathToApp
 */
function ensureGagarinVersionsMatch(pathToApp, verbose) {

  var pathToMeteorPackages = path.join(pathToApp, '.meteor', 'packages');
  var nodeModuleVersion    = require('../../package.json').version;

  return new Promise(function (resolve, reject) {

    common.getGagarinPackageVersion(pathToApp).then(function (packageVersion) {

      if (packageVersion === nodeModuleVersion) {
        logs.system("node module and smart package versions match, " + packageVersion);
        return resolve();
      }

      common.getMeteorVersion(pathToApp).then(function (meteorReleaseVersion) {

        if (meteorReleaseVersion < "0.9.0") {
          // really, we can do nothing about package version
          // without a decent package management system
          logs.system("meteor version is too old to automatically fix package version");
          return resolve();
        }

        logs.system("meteor add anti:gagarin@=" + nodeModuleVersion);

        var meteor = spawn('meteor', [ 'add', 'anti:gagarin@=' + nodeModuleVersion ], {

          stdio: verbose ? 'inherit' : 'ignore', cwd: pathToApp
        });

        meteor.on('error', reject);

        meteor.on('exit', function (code) {
          if (code > 0) {
            return reject(new Error('meteor exited with code ' + code));
          }
          logs.system("anti:gagarin is know in version " + nodeModuleVersion);
          resolve();
        });

      }).catch(reject);

    }).catch(reject);

  }); // Promise
}
