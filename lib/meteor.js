
var makeDDPClientFactory = require('./ddp');
var MongoServerAsPromise = require('./mongo');
var MeteorPromiseChain   = require('./meteorPromiseChain');
var BuildAsPromise       = require('./build');
var Instance             = require('./instance');
var Remote               = require('./remote');
var Closure              = require('./closure');
var Promise              = require('es6-promise').Promise;
var either               = require('./tools').either;
var spawn                = require('child_process').spawn;
var chalk                = require('chalk');
var tools                = require('./tools');
var path                 = require('path');
var fs                   = require('fs');

module.exports                = Meteor;
module.exports.BuildAsPromise = BuildAsPromise;
module.exports.MongoAsPromise = MongoServerAsPromise;

//-------
// METEOR
//-------

function Meteor (options) {
  "use strict";

  var mongoServerPromise = null;
  var nodePath = tools.getNodePath(options.pathToApp);
  var instance = null;
  var lastError = "";
  var lastErrorAt = "nowhere";
  var meteorPromise = null;
  var meteorHasCrashed = false;
  var meteorSafetyTimeout = null;
  var ddpClientAsPromise = makeDDPClientFactory(serverControllerProvider);
  var meteorRestartTimeout = 100;
  var restartRequired = false;

  if (typeof options === 'string') {
    options = { pathToApp: options };
  }

  //\/\/\/\/\/\/\/\/\/\/\/\ DEFAULT OPTIONS \/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/
  options = options || {};
  options.pathToApp = options.pathToApp || defaults.pathToApp || path.resolve('.');
  options.dbName = options.dbName || 'gagarin_' + (new Date()).getTime();
  options.port = options.port || 4000 + Math.floor(Math.random() * 1000);
  options.location = 'http://localhost:' + options.port;
  //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

  var remote = new Remote(ddpClientAsPromise, serverControllerProvider);

  mongoServerPromise = new MongoServerAsPromise(options);

  this.location = options.location;
  this.helpers  = options.helpers || {};

  this.useClosure = function (objectOrGetter) {
    remote.useClosure(objectOrGetter);
  };

  this.meteorRemoteAsPromise = Promise.resolve(remote);

  function cleanUpThen(callback) {
    if (instance) {
      instance.kill(callback);
      instance = null;
      clearTimeout(meteorSafetyTimeout);
      meteorSafetyTimeout = null;
    } else {
      setTimeout(callback);
    }
  }

  function serverControllerProvider () { // and callback

    var callback = arguments[arguments.length-1];

    if (meteorHasCrashed && !restartRequired) {
      restartRequired = true;
      if (lastError) {
        return Promise.reject(new Error(chalk.red(lastError) + chalk.blue(' => ') + chalk.blue(lastErrorAt)));
      }
      return Promise.reject(new Error(chalk.red('Meteor server has crashed due to some unknown reason.')));  
    }

    if (!meteorHasCrashed && !restartRequired && meteorPromise) {
      return meteorPromise;
    }

    restartRequired = false;

    meteorPromise = new Promise(function (resolve, reject) {

      var instanceOptions = {
        onSpawn: function (err) {
          if (err) {
            return reject(err);
          }
          clearTimeout(meteorSafetyTimeout);
          meteorSafetyTimeout = null;
          resolve({
            meteorPort    : options.port,
            uniqueToken   : Math.random(),
            restart : function (cb) {
              console.log('restarting');
              restartRequired = true;
              return serverControllerProvider(true).then(function () {
                cb();
              }, function (err) {
                cb(err);
              });
            },
            stop : function (cb) {
              cleanUpThen(function (err) {
                if (err) {
                  return cb(err);
                }
                mongoServerPromise.connectToDB(options.dbName).then(function (db) {
                  db.dropDatabase(cb);
                }, function (err) {
                  cb(err);
                });
              });
            },
          });
        },
        onExit: function (code, _lastError, _lastErrorAt) {
          meteorHasCrashed = code !== 0;
          //----------------------------
          meteorPromise = null;
          instance = null;
          lastError = _lastError;
          lastErrorAt = _lastErrorAt;
        },
      };

      cleanUpThen(function respawn() {

        setTimeout(function () {

          meteorHasCrashed = false

          Promise.all([

            BuildAsPromise(options.pathToApp), mongoServerPromise

          ]).then(function (all) {

            var pathToMain = all[0];
            var env        = Object.create(process.env);

            env.ROOT_URL         = options.location;
            env.PORT             = options.port;
            env.MONGO_URL        = all[1] + '/' + options.dbName;
            env.GAGARIN_SETTINGS = "{}";

            instance = new Instance(nodePath, pathToMain, env, instanceOptions);

            meteorSafetyTimeout = setTimeout(function () {
              cleanUpThen(function () {
                reject(new Error('Gagarin is not there.' +
                  ' Please make sure you have added it with: meteor add anti:gagarin.'));
              });
            }, options.safetyTimeout || 10000);

          }, function (err) {
            reject(err);
          });

        }, meteorRestartTimeout);

      });

    });

    return meteorPromise;
  } // serverControllerProvider

}

MeteorPromiseChain.methods.forEach(function (name) {
  "use strict";

  Meteor.prototype[name] = function () {
    var chain = new MeteorPromiseChain(this.meteorRemoteAsPromise, this.helpers);
    return chain[name].apply(chain, arguments);
  };

});

