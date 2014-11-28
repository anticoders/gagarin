
var MongoServerAsPromise = require('./mongo');
var GagarinTransponder   = require('./transponder');
var BuildAsPromise       = require('./build');
var Promise              = require('es6-promise').Promise;
var either               = require('./tools').either;
var spawn                = require('child_process').spawn;
var tools                = require('./tools');
var path                 = require('path');
var fs                   = require('fs');

var defaults = tools.getConfig();
var mongoServerPromise = null;

module.exports                = Gagarin;
module.exports.BuildAsPromise = BuildAsPromise;
module.exports.MongoAsPromise = MongoServerAsPromise;

function Gagarin (options) {

  //\/\/\/\/\/\/\/\/\/\/\/\ DEFAULT OPTIONS \/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/
  options = options || {};
  options.pathToApp = options.pathToApp || defaults.pathToApp || path.resolve('.');
  options.dbName = options.dbName || 'gagarin_' + (new Date()).getTime();
  options.port = options.port || 4000 + Math.floor(Math.random() * 1000);
  options.location = 'http://localhost:' + options.port;
  //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

  var release = tools.getReleaseConfig(options.pathToApp);
  var env     = Object.create(process.env);

  env.ROOT_URL = options.location;
  env.PORT     = options.port;

  if (!mongoServerPromise) {
    // XXX there can be only one mongo process using the given database path
    mongoServerPromise = new MongoServerAsPromise(options);
  }

  var gagarinAsPromise = new GagarinAsPromise(options, Promise.all([
    BuildAsPromise(options.pathToApp), mongoServerPromise
  ]).then(function (all) {
    var pathToMain = all[0];

    env.MONGO_URL = all[1] + '/' + options.dbName;

    return new Promise(function (resolve, reject) {
      
      var nodePath = tools.getNodePath(options.pathToApp);
      var meteor = null;
      var meteorPromise = null;
      var meteorSafetyTimeout = null;

      function cleanUpThen(callback) {
        if (meteor) {
          meteor.once('exit', callback);
          meteor.kill();
          meteor = null;
          clearTimeout(meteorSafetyTimeout);
          meteorSafetyTimeout = null;
        } else {
          setTimeout(callback);
        }
      }

      function meteorAsPromise (meteorNeedRestart, meteorRestartTimeout) {
        if (!meteorNeedRestart && meteorPromise) {
          return meteorPromise;
        }

        meteorPromise = new Promise(function (resolve, reject) {

          cleanUpThen(function respawn() {

            setTimeout(function () {

              meteorSafetyTimeout = setTimeout(function () {
                cleanUpThen(function () {
                  reject(new Error('Gagarin is not there.' +
                    ' Please make sure you have added it with: mrt install gagarin.'));
                });
              }, options.safetyTimeout || 10000);

              meteor = spawn(nodePath, [ pathToMain ], { env: env });

              meteor.stdout.on('data', function (data) {
                //process.stdout.write(data);
                var match = /Gagarin listening at port (\d+)/.exec(data.toString());
                if (match) {
                  // make sure we won't kill this process by accident
                  clearTimeout(meteorSafetyTimeout);
                  meteorSafetyTimeout = null;
                  meteor.gagarinPort = parseInt(match[1]);
                  resolve(meteor);
                }
              });

              meteor.stderr.on('data', function (data) {
                process.stdout.write(data);
              });

            }, meteorRestartTimeout);

            // TODO: do we even need this one?
            //process.on('exit', function () {
            //  meteor && meteor.kill();
            //  meteor = null;
            //});

          });

        });

        return meteorPromise;
      }

      //-------------------------------------------------
      meteorAsPromise.needRestart = function (timeout) {
        meteorRestartTimeout = timeout;
        meteorNeedRestart = true;
      };

      resolve(new GagarinTransponder(meteorAsPromise, {
        cleanUp: function () {
          return mongoServerPromise.connectToDB(options.dbName).then(function (db) {
            return new Promise(function (resolve, reject) {
              db.dropDatabase(either(reject).or(resolve));
            });
          });
        }
      }));

    });

  }));
  
  gagarinAsPromise.location = options.location;
  
  return gagarinAsPromise;
}

Gagarin.config = function (options) {
  Object.keys(options).forEach(function (key) {
    defaults[key] = options[key];
  });
};

// GAGARIN AS PROMISE

function GagarinAsPromise (options, operand, promise) {
  this._operand = operand;
  this._promise = promise || operand;
  this._options = options;
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
    return new GagarinAsPromise(this._options, this._operand, this._promise[name].apply(this._promise, arguments));
  }
});

// proxies for transponder methods

[ 'execute', 'promise', 'exit', 'start', 'restart' ].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    return new GagarinAsPromise(self._options, self._operand, Promise.all([ self._operand, self._promise ]).then(function (all) {
      return all[0][name].apply(all[0], args);
    }));
  };
});

