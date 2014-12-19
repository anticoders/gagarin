var MongoServerAsPromise = require('./mongo');
var Promise              = require('es6-promise').Promise;
var chalk                = require('chalk');
var spawn                = require('child_process').spawn;
var tools                = require('./tools');
var path                 = require('path');
var fs                   = require('fs');
var version              = require('../package.json').version;

var myBuildPromises = {};

module.exports = function BuildAsPromise (options) {
  "use strict";

  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');
  var timeout   = options.timeout   || 60000;
  var verbose   = options.verbose !== undefined ? !!options.verbose : false;

  var pathToVersions  = path.join(pathToApp, '.meteor', 'versions');
  var pathToSmartJson = path.join(pathToApp, 'smart.json');
  var pathToMain      = path.join(pathToApp, '.meteor', 'local', 'build', 'main.js');
  var skipBuild       = !!options.skipBuild;

  if (skipBuild || isLocked(pathToApp)) {
    if (fs.existsSync(pathToMain)) {
      return Promise.resolve(pathToMain);
    } else {
      return Promise.reject(new Error('File: ' + pathToMain + ' does not exist.'));
    }
  }

  var versions = fs.readFileSync(pathToVersions, 'utf-8');
  var versionMatch = versions.match(/anti:gagarin@(.*)/);

  if (!versionMatch) {
    return Promise.reject(new Error('Please add anti:gagarin to your app before running tests.'));
  } else if (versionMatch[1] !== version) {
    return Promise.reject(new Error(
      'Versions of node package (' + version +
      ') and meteor packages (' + versionMatch[1] +
      ') are not compatible; please update.'
    ));
  }

  if (myBuildPromises[pathToApp]) return myBuildPromises[pathToApp];

  if (fs.existsSync(pathToSmartJson)) {
    myBuildPromises[pathToApp] = tools.smartPackagesAsPromise(pathToApp).then(function () {
      return MongoServerAsPromise({ pathToApp: pathToApp }).then(function (mongoUrl) {
        return BuildPromise({
          pathToApp : pathToApp,
          mongoUrl  : mongoUrl,
          verbose   : verbose,
        });
      });
    });
  } else {
    myBuildPromises[pathToApp] = MongoServerAsPromise({ pathToApp: pathToApp }).then(function (mongoUrl) {
      return BuildPromise({
        pathToApp : pathToApp,
        mongoUrl  : mongoUrl,
        verbose   : verbose,
      });
    });
  }

  return myBuildPromises[pathToApp];
};

// PRIVATE BUILD PROMISE IMPLEMENTATION

function BuildPromise(options) {
  "use strict";

  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');
  var mongoUrl  = options.mongoUrl  || "http://localhost:27017";
  var timeout   = options.timeout   || 60000;
  var verbose   = options.verbose !== undefined ? !!options.verbose : false;

  var pathToMain = path.join(pathToApp, '.meteor', 'local', 'build', 'main.js');
  var env        = Object.create(process.env);
  var port       = 4000 + Math.floor(Math.random() * 1000);

  // TODO: in the end, drop this database
  env.MONGO_URL = mongoUrl + '/' + 'gagarin_build';

  return new Promise(function (resolve, reject) {

    var meteor = spawn('meteor', [
      '--production',
      '--port', port
    ], { cwd: pathToApp, env: env });

    //var lastError = '';
    //var lastErrorAt = 'nowhere';
    var hasErrors      = false;
    var linesOfMessage = [];

    //----------------------------------------
    meteor.stdout.on('data', function (data) {

      //process.stdout.write(data);
      logMeteorOutput(data);

      data.toString().split('\n').forEach(function (line) {

        var hasMatch = [
          {
            regExp: /App running at:/,
            action: function () {
              meteor.once('exit', function () {
                if (fs.existsSync(pathToMain)) {
                  resolve(pathToMain);
                } else {
                  reject(new Error('Meteor build failed.'));
                }
              });
              meteor.kill('SIGINT');
            }
          },

          //{
          //  regExp: /Error\:\s*(.*)/,
          //  action: function (match) {
          //    lastError   = match[1];
          //    lastErrorAt = '';
          //  },
          //},

          //{
          //  regExp: /at\s.*/,
          //  action: function (match) {
          //    if (!lastErrorAt) {
          //      lastErrorAt = match[0];
          //    }
          //  },
          //},

          {
            regExp: /Errors prevented startup:/,
            action: function () {
              hasErrors = true;
              //if (lastError) {
              //  reject(new Error(chalk.red(lastError) + chalk.magenta(' => ') + chalk.magenta(lastErrorAt)));
              //} else {
              //  reject(new Error('Your app does not compile, but I do not know the reason.'));
              //}
            },
          },

          {
            regExp: /Your application has errors. Waiting for file change./,
            action: function () {
              if (linesOfMessage.length) {
                reject(new Error(chalk.red(linesOfMessage.join('\n'))));
              } else {
                reject(new Error('Your app does not compile, but I do not know the reason.'));
              }
              meteor.kill('SIGINT');
            }
          },

        ].some(function (options) {
          var match = options.regExp.exec(line);
          if (match) {
            options.action.call(null, match);
            return true;
          }
        });

        if (hasErrors && !hasMatch) {
          linesOfMessage.push(line);
        }

      });

    });

    meteor.stdout.on('error', function (data) {
      console.log(chalk.red(data.toString()));
    });

    setTimeout(function () {
      meteor.once('exit', function () {
        reject(new Error('Timeout while wating for meteor to start.'));
      });
      meteor.kill('SIGINT')
    }, timeout);

  }); // new Promise

  function logMeteorOutput(data) {
    if (!verbose) {
      return;
    }
    process.stdout.write(data.toString().split('\n').map(function (line) {
      if (line === '\r') {
        return;
      }
      if (line.length === 0) {
        return "";
      }
      return chalk.green('<---> ') + line;
    }).join('\n'));
  }

} // BuildPromise

/**
 * Guess if meteor is currently running.
 */
function isLocked(pathToApp) {
  var pathToMongoLock = path.join(pathToApp, '.meteor', 'local', 'db', 'mongod.lock');
  return fs.existsSync(pathToMongoLock) && fs.readFileSync(pathToMongoLock).toString('utf8'); 
}

