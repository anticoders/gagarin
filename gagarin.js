
var Promise = require('es6-promise').Promise;
var spawn = require('child_process').spawn;
var fs = require('fs');
var util = require('util');
var EventEmiter = require('events').EventEmitter;
var mongo = require('./mongo');
var tools = require('./tools');
var mongoServer = null;
var config = tools.getConfig();
var path = require('path');
var buildAsPromise = require('./build');
var makeSocketFactory = require('./socket');
var GagarinTransponder = require('./transponder');

module.exports = Gagarin;

function Gagarin (options) {
  options = options || {};
  
  var port = 4000 + Math.floor(Math.random() * 1000);
  var dbName = options.dbName || 'gagarin_' + Date.now();
  var env = Object.create(process.env);
  var meteorConfig = tools.getReleaseConfig(options.pathToApp);

  env.ROOT_URL = 'http://localhost:' + port;
  env.PORT = port;
  
  if (!mongoServer) {
    if (!config.mongoPath) {
      config.mongoPath = path.join(tools.getUserHome(), '.meteor', 'tools', meteorConfig.tools, 'mongodb', 'bin', 'mongod');
    }
    mongoServer = new mongo.Server(config);
  }

  var gagarinAsPromise = new GagarinAsPromise(Promise.all([
    buildAsPromise(options.pathToApp), mongoServer
  ]).then(function (all) {

    var pathToMain = all[0];

    env.MONGO_URL = 'mongodb://localhost:' + all[1].port + '/' + dbName;

    return new Promise(function (resolve, reject) {
      // add timeout ??

      // TODO: guess the correct path from .meteor/release file
      var nodePath = path.join(tools.getUserHome(), '.meteor', 'tools',  meteorConfig.tools, 'bin', 'node');
      
      var meteor = null;
      var meteorPromise = null;
      var meteorNeedRestart = true;

      function meteorAsPromise () {

        if (!meteorNeedRestart) {
          if (meteorPromise) {
            return meteorPromise;
          }
        }

        meteorNeedRestart = false;
        meteorPromise = new Promise(function (resolve, reject) {

          process.on('exit', function () {
            meteor && meteor.kill();
            meteor = null;
          });

          meteor && meteor.kill();
          meteor = spawn(nodePath, [ pathToMain ], { env: env });

          meteor.stdout.on('data', function (data) {
            var match = /Gagarin listening at port (\d+)/.exec(data.toString());
            if (match) {
              meteor.gagarinPort = parseInt(match[1]);
              resolve(meteor);
            }
          });

        });

        return meteorPromise;
      }

      //-----------------------------------------
      meteorAsPromise.needRestart = function () {
        meteorNeedRestart = true;
      };

      var gagarin = new GagarinTransponder(meteorAsPromise, { cleanUp: function () {
        return mongo.connect(mongoServer, dbName).then(function (db) {
          return db.drop();
        });
      }});

      resolve(gagarin);

    });

  }));
  
  gagarinAsPromise.location = env.ROOT_URL;
  
  return gagarinAsPromise;
}

Gagarin.config = function (options) {
  Object.keys(options).forEach(function (key) {
    config[key] = options[key];
  });
};

// GAGARIN AS PROMISE

function GagarinAsPromise (operand, promise) {
  this._operand = operand;
  this._promise = promise || operand;
}

GagarinAsPromise.prototype.sleep = function (timeout) {
  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

GagarinAsPromise.prototype.expectError = function (callback) {
  var self = this;
  return self.then(function () {
    throw new Error('exception was not thrown');
  }, callback);
};

// proxies for promise methods

[ 'then', 'catch' ].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    return new GagarinAsPromise(this._operand, this._promise[name].apply(this._promise, arguments));
  }
});

// proxies for transponder methods

[ 'eval', 'promise', 'exit', 'start', 'restart' ].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    return new GagarinAsPromise(self._operand, Promise.all([ self._operand, self._promise ]).then(function (all) {
      return all[0][name].apply(all[0], args);
    }));
  };
});

