
var applyCodeFixtures   = require('./applyCodeFixtures');
var createMeteorProcess = require('./meteorProcess');
var findAvailablePort   = require('../tools').findAvailablePort;
var Promise             = require('es6-promise').Promise;
var chalk               = require('chalk');
var tools               = require('../tools');
var either              = require('../tools').either;
var path                = require('path');
var ncp                 = require('ncp');

module.exports = function createMeteorProcessManager (options) {
  "use strict";
  options = options || {};
  var meteorProcessPrototype = {};
  var meteorProcess          = null;
  var meteorPromise          = null;

  var pathToMain = "";
  var pathToNode = "";
  var mongoUrl   = "";

  var codeFixtures = {};

  var meteorHasCrashed = false;
  var meteorSettings   = tools.getSettings(options.settings);

  var meteorRestartDelay = 100;
  var restartRequired    = false;

  var meteorPort = null;
  var verbose    = !!options.verbose;

  meteorProcessPrototype.restart = function (delay) {

    var done = arguments[arguments.length - 1];

    if (arguments.length >= 2) {
      meteorRestartDelay = delay;
    } else {
      meteorRestartDelay = 100;
    }

    restartRequired = true;

    if (verbose) {
      console.log(chalk.cyan('[system]') + ' restart requested');
    }

    getMeteorProcess({

      pathToMain : pathToMain,
      pathToNode : pathToNode,
      mongoUrl   : mongoUrl,

    }).then(function () { done() }).catch(done);
  }

  function getMeteorProcess (setup) {
    // TODO: also compare code fixtures
    // TODO: make sure the set up is fine
    if (pathToMain !== setup.pathToMain || pathToNode !== setup.pathToNode || mongoUrl !== setup.mongoUrl) {
      restartRequired = true;
    }
    pathToMain = setup.pathToMain;
    pathToNode = setup.pathToNode;
    mongoUrl   = setup.mongoUrl;

    codeFixtures = setup.fixtures;

    if (!restartRequired && !!meteorPromise) {
      if (meteorHasCrashed) {
        restartRequired = true;
      }
      return meteorPromise;
    }

    restartRequired = false;

    meteorPromise = new Promise(function (resolve, reject) {

      cleanUpThen(function () {

        meteorHasCrashed = false;

        (meteorPort ? Promise.resolve(meteorPort) : findAvailablePort()).then(function (port) {

          meteorPort = port;

          var pathToBuild = path.dirname(pathToMain);
          var env = Object.create(process.env);

          if (meteorSettings) {
            env.METEOR_SETTINGS = JSON.stringify(meteorSettings);
          }

          env.ROOT_URL         = 'http://localhost:' + meteorPort;
          env.PORT             = meteorPort;
          env.MONGO_URL        = mongoUrl;
          env.GAGARIN_SETTINGS = "{}"; // only used if METEOR_SETTINGS does not contain gagarin field

          // TODO: do not copy code if we are only restarting the process

          var main = setup.pathToMain;
          if (codeFixtures && codeFixtures.length > 0) {
            var id   = require('shortid').generate();
            var dest = path.join(options.pathToApp || module.exports.getUserHome(), '.gagarin', 'local', 'build_' + id);
            main = dest + '/main.js';
            isolateCode(pathToBuild, dest, function () {
              applyCodeFixtures(codeFixtures, dest, either(reject).or(spawnProcess));
            });
          } else {
            spawnProcess();
          }

          function spawnProcess () {
            setTimeout(function () {
              meteorProcess = new createMeteorProcess(pathToNode, main, env, meteorProcessPrototype, options,id);
            }, meteorRestartDelay);
          }

        }).catch(reject);

      });

      // callbacks to cooperate with meteor process

      meteorProcessPrototype.onStart = function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this);
      };

      meteorProcessPrototype.onExit = function (code, lastError, lastErrorAt) {
        meteorHasCrashed = (code && code !== 0 && code !== 130);
        if (meteorHasCrashed) {
          if (lastError) {
            meteorPromise = Promise.reject(new Error(chalk.red(lastError) + chalk.blue(' => ') + chalk.blue(lastErrorAt)));
          } else {
            meteorPromise = Promise.reject(new Error(chalk.red('Meteor server has crashed due to some unknown reason.')));
          }
        }
      };

      meteorProcessPrototype.onData = function (data, opts) {
        logServerOutput(data, opts && opts.isError ? chalk.red : chalk.blue);
      };

    });

    return meteorPromise;
  }

  function cleanUpThen(callback) {
    meteorPromise = null;
    //-------------------
    if (meteorProcess) {
      meteorProcess.kill(callback);
      meteorProcess = null;
    } else {
      callback();
    }
  }

  function isolateCode(source, dest,callback){
    ncp(source, dest, function (err) {
      callback(err);
    });
  }

  function logServerOutput(data, color) {
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
      return color('[server] ') + line;
    }).join('\n'));
  }

  return getMeteorProcess;

}
