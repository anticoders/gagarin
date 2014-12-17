

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
var url                  = require('url');

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

  var pathToApp    = options.pathToApp || path.resolve('.');
  var remoteServer = options.remoteServer;
  var verbose      = !!options.verbose;

  if (remoteServer) {
    remoteServer = url.parse(remoteServer);
  }

  var mongoServerPromise = !remoteServer && new MongoServerAsPromise({ pathToApp: pathToApp });
  var ddpClientAsPromise = makeDDPClientFactory(ddpSetupProvider);

  var instance      = null;
  var meteorPromise = null;

  var meteorHasCrashed = false;
  var meteorUniqueCode = null;
  var meteorSettings   = tools.getSettings(options.settings);

  var meteorRestartDelay = 100;
  var restartRequired    = false;

  var meteorPort     = options.port || 4000 + Math.floor(Math.random() * 1000);
  var meteorLocation = remoteServer ? url.format(remoteServer) : 'http://localhost:' + meteorPort;
  var meteorDatabase = options.dbName || 'gagarin_' + (new Date()).getTime();

  if (meteorLocation.charAt(meteorLocation.length - 1) === "/") {
    meteorLocation = meteorLocation.substr(0, meteorLocation.length - 1);
  }

  var remote = new Remote(ddpClientAsPromise, serverControllerProvider);
  
  var dummyController = {
    start   : noop,
    restart : noop,
    stop    : noop,
  };

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
    
    if (remoteServer) {
      return Promise.resolve({
        host: remoteServer.hostname,
        port: remoteServer.port || 443,
      });
    }

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

    if (remoteServer) {
      return meteorPromise = Promise.resolve(dummyController);
    }

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
        onData: function (data, options) {
          if (options && options.isError) {
            logServerError(data);
          } else {
            logServerOutput(data);
          }
        },
      };

      cleanUpThen(function () { // respawn

        meteorHasCrashed = false

        Promise.all([ BuildAsPromise(pathToApp), mongoServerPromise ]).then(function (all) {

          var pathToMain = all[0];
          var env        = Object.create(process.env);

          if (meteorSettings) {
            env.METEOR_SETTINGS = JSON.stringify(meteorSettings);
          }

          env.ROOT_URL         = meteorLocation;
          env.PORT             = meteorPort;
          env.MONGO_URL        = all[1] + '/' + meteorDatabase;
          env.GAGARIN_SETTINGS = "{}"; // only used if METEOR_SETTINGS does not contain gagarin field

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

  function logServerOutput(data) {
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
      return chalk.blue('[server] ') + line;
    }).join('\n'));
  }

  function logServerError(data) {
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
      return chalk.red('[server] ') + line;
    }).join('\n'));
  }

  function deny (cb) {
    cb(new Error('action not allowed'));
  }

  function noop (cb) {
    cb();
  }

}

MeteorPromiseChain.methods.forEach(function (name) {
  "use strict";

  Meteor.prototype[name] = function () {
    var chain = new MeteorPromiseChain(this.meteorRemoteAsPromise, this.helpers);
    return chain[name].apply(chain, arguments);
  };

});

