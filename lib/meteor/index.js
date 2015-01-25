

/**
 * Module dependencies.
 */

var createDDPClientManager = require('../ddp/ddpClientManager');

var MeteorPromiseChain   = require('./meteorPromiseChain');
var findAvailablePort    = require('../tools').findAvailablePort;
var MongoDatabase        = require('../mongo/database');
var BuildAsPromise       = require('./build');
var Instance             = require('./meteorProcess');
var Promise              = require('es6-promise').Promise;
var Remote               = require('./remote');
var chalk                = require('chalk');
var tools                = require('../tools');
var path                 = require('path');
var url                  = require('url');

module.exports                = Meteor;
module.exports.BuildAsPromise = BuildAsPromise;

//-------
// METEOR
//-------

function Meteor (options) {
  "use strict";

  var self = this;

  options = options || {};

  if (typeof options === 'string') {
    options = { pathToApp: options };
  }

  var pathToApp       = options.pathToApp || path.resolve('.');
  var remoteServer    = options.remoteServer;
  var verbose         = !!options.verbose;
  var skipBuild       = !!options.skipBuild;

  var mongoUrlPromise = null;
  var databasePromise = null;

  if (remoteServer) {
    remoteServer = url.parse(remoteServer);
  }

  if (typeof options.mongoUrl === 'string') {
    mongoUrlPromise = Promise.resolve(options.mongoUrl);
  } else if (options.mongoUrl && options.mongoUrl.then) {
    mongoUrlPromise = options.mongoUrl;
  } else if (options.mongoUrl) {
    throw new Error('mongoUrl must be a string or a promise returning a string');
  }

  if (!mongoUrlPromise && !remoteServer) {
    databasePromise = new MongoDatabase({ pathToApp: pathToApp });
    mongoUrlPromise = databasePromise.getMongoUrlPromise();
  }

  var getDDPClient = createDDPClientManager();

  var instance      = null;
  var meteorPromise = null;

  var meteorHasCrashed = false;
  var meteorUniqueCode = null;
  var meteorSettings   = tools.getSettings(options.settings);

  var meteorRestartDelay = 100;
  var restartRequired    = false;

  var meteorPort     = null;
  var meteorDatabase = options.dbName || 'gagarin_' + (new Date()).getTime();

  function ddpClient () {
    return ddpSetupProvider().then(function (setup) {
      return getDDPClient(setup);
    });
  }

  var remote = new Remote(ddpClient, serverControllerProvider);
  
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
        }).catch(function (err) {
          cb(err);
        });
    },
    stop : function (cb) {
      cleanUpThen(function (err) {
        if (err) {
          return cb(err);
        }
        databasePromise.then(function (db) {
          db.cleanUp(cb);
        }).catch(function (err) {
          cb(err);
        });
      });
    },
  };

  // set-up helpers
  options.helpers = options.helpers || {};

  self.helpers  = {};
  self.methods  = Object.keys(options.helpers).concat(MeteorPromiseChain.methods);

  Object.keys(options.helpers).forEach(function (key) {
    if (self[key] !== undefined) {
      console.warn('helper ' + key + ' conflicts with some Meteor method');
    }
    self[key] = self.helpers[key] = options.helpers[key];
  });

  self.useClosure = function (objectOrGetter) {
    remote.useClosure(objectOrGetter);
  };

  self.meteorRemoteAsPromise = Promise.resolve(remote);

  self._ddpSetupProvider = ddpSetupProvider;

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

        Promise.all([
          
          BuildAsPromise({
            pathToApp: pathToApp,
            skipBuild: skipBuild,
          }),

          mongoUrlPromise,

          findAvailablePort(meteorPort),

        ]).then(function (all) {

          var pathToMain = all[0];
          var mongoUrl   = all[1];
          
          meteorPort = all[2];

          var env = Object.create(process.env);

          if (meteorSettings) {
            env.METEOR_SETTINGS = JSON.stringify(meteorSettings);
          }

          env.ROOT_URL         = 'http://localhost:' + meteorPort;
          env.PORT             = meteorPort;
          env.MONGO_URL        = mongoUrl;
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

