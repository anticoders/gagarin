

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
  var ddpClientAsPromise = makeDDPClientFactory(ddpSetupProvider);

  var instance      = null;
  var meteorPromise = null;

  var meteorHasCrashed    = false;
  var meteorUniqueCode    = null;

  var meteorRestartDelay = 100;
  var restartRequired    = false;

  var meteorPort     = options.port || 4000 + Math.floor(Math.random() * 1000);
  var meteorLocation = 'http://localhost:' + meteorPort;
  var meteorDatabase = options.dbName || 'gagarin_' + (new Date()).getTime();

  var remote = new Remote(ddpClientAsPromise, serverControllerProvider);

  var controller = {
    start   : function (cb) { cb() },
    restart : function (cb) {
      (restartRequired = true) && serverControllerProvider()
        .then(function () {
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
  };

  this.location = meteorLocation;
  this.helpers  = options.helpers || {};

  this.useClosure = function (objectOrGetter) {
    remote.useClosure(objectOrGetter);
  };

  this.meteorRemoteAsPromise = Promise.resolve(remote);

  function cleanUpThen(callback) {
    meteorPromise = null;
    //-------------------
    if (instance) {
      instance.kill(callback);
      instance = null;
    } else {
      callback();
    }
  }

  function ddpSetupProvider() {
    return serverControllerProvider().then(function () {
      return {
        port: meteorPort,
        code: meteorUniqueCode,
      };
    });
  }

  function serverControllerProvider () {

    if (!restartRequired && !!meteorPromise) {
      if (meteorHasCrashed) {
        restartRequired = true;
      }
      return meteorPromise;
    }

    restartRequired = false;

    meteorPromise = new Promise(function (resolve, reject) {

      var instanceOptions = {
        onStart: function (err) {
          if (err) {
            return reject(err);
          }
          meteorUniqueCode = Math.random();
          //-------------------------------
          resolve(controller);
        },
        onExit: function (code, lastError, lastErrorAt) {
          meteorHasCrashed = (code && code !== 0 && code !== 130);
          //------------------------------------------------------
          if (meteorHasCrashed) {
            if (lastError) {
              meteorPromise = Promise.reject(new Error(chalk.red(lastError) + chalk.blue(' => ') + chalk.blue(lastErrorAt)));
            } else {
              meteorPromise = Promise.reject(new Error(chalk.red('Meteor server has crashed due to some unknown reason.')));
            }
          }
        },
      };

      cleanUpThen(function () { // respawn

        meteorHasCrashed = false

        Promise.all([ BuildAsPromise(pathToApp), mongoServerPromise ]).then(function (all) {

          var pathToMain = all[0];
          var env        = Object.create(process.env);

          env.ROOT_URL         = meteorLocation;
          env.PORT             = meteorPort;
          env.MONGO_URL        = all[1] + '/' + meteorDatabase;
          env.GAGARIN_SETTINGS = "{}";

          setTimeout(function () {
            instance = new Instance(tools.getNodePath(pathToApp), pathToMain, env, instanceOptions);
          }, meteorRestartDelay);

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

