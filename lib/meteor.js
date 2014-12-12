

/**
 * Module dependencies.
 */

var makeDDPClientFactory = require('./ddp');
var MongoServerAsPromise = require('./mongo');
var MeteorPromiseChain   = require('./meteorPromiseChain');
var BuildAsPromise       = require('./build');
var Instance             = require('./instance');
var Promise              = require('es6-promise').Promise;
var Remote               = require('./remote');
var chalk                = require('chalk');
var tools                = require('./tools');
var path                 = require('path');

module.exports                = Meteor;
module.exports.BuildAsPromise = BuildAsPromise;
module.exports.MongoAsPromise = MongoServerAsPromise;

//-------
// METEOR
//-------

function Meteor (options) {
  "use strict";

  options = options || {};

  if (typeof options === 'string') {
    options = { pathToApp: options };
  }

  var pathToApp  = options.pathToApp || path.resolve('.');

  var mongoServerPromise = new MongoServerAsPromise({ pathToApp: pathToApp });
  var ddpClientAsPromise = makeDDPClientFactory(serverControllerProvider);

  var instance      = null;
  var lastError     = "";
  var lastErrorAt   = "nowhere";
  var meteorPromise = null;

  var meteorHasCrashed    = false;
  var meteorSafetyTimeout = null;

  var meteorRestartDelay = 100;
  var restartRequired    = false;

  var meteorPort     = options.port || 4000 + Math.floor(Math.random() * 1000);
  var meteorLocation = 'http://localhost:' + meteorPort;
  var meteorDatabase = options.dbName || 'gagarin_' + (new Date()).getTime();

  var remote = new Remote(ddpClientAsPromise, serverControllerProvider);

  this.location = meteorLocation;
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
          resolve({
            meteorPort    : meteorPort,
            uniqueToken   : Math.random(),
            restart : function (cb) {
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
                mongoServerPromise.connectToDB(meteorDatabase).then(function (db) {
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

      cleanUpThen(function () { // respawn

        meteorHasCrashed = false

        Promise.all([

          BuildAsPromise(pathToApp), mongoServerPromise

        ]).then(function (all) {

          var pathToMain = all[0];
          var env        = Object.create(process.env);

          env.ROOT_URL         = meteorLocation;
          env.PORT             = meteorPort;
          env.MONGO_URL        = all[1] + '/' + meteorDatabase;
          env.GAGARIN_SETTINGS = "{}";


          setTimeout(function () {
            instance = new Instance(tools.getNodePath(pathToApp), pathToMain, env, instanceOptions);
          }, meteorRestartDelay);

          meteorSafetyTimeout = setTimeout(function () {
            cleanUpThen(function () {
              reject(new Error('Gagarin is not there.' +
                ' Please make sure you have added it with: meteor add anti:gagarin.'));
            });
          }, options.safetyTimeout || 10000);

        }, function (err) {
          reject(err);
        });

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

