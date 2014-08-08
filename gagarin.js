
var Promise = require('es6-promise').Promise;
var spawn = require('child_process').spawn;
var fs = require('fs');
var mongo = require('./mongo');
var tools = require('./tools');
var path = require('path');
var buildAsPromise = require('./build');
var GagarinTransponder = require('./transponder');

var defaults = tools.getConfig();
var mongoServerPromise = null;

module.exports = Gagarin;

function Gagarin (options) {

  //\/\/\/\/\/\/\/\/\/\/\/\ DEFAULT OPTIONS \/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/
  options = options || {};
  options.pathToApp = options.pathToApp || defaults.pathToApp || path.resolve('.');
  options.dbName = options.dbName || 'gagarin_' + Math.floor(Math.random() * 1000);
  options.port = options.port || 4000 + Math.floor(Math.random() * 1000);
  options.location = 'http://localhost:' + options.port;
  //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

  var release = tools.getReleaseConfig(options.pathToApp);
  var env = Object.create(process.env);

  env.ROOT_URL = options.location;
  env.PORT = options.port;
  
  if (!mongoServerPromise) {
    if (!defaults.mongoPath) {
      defaults.mongoPath =
        path.join(tools.getUserHome(), '.meteor', 'tools',
          release.tools, 'mongodb', 'bin', 'mongod');
    }
    mongoServerPromise = new mongo.Server(defaults);
  }

  var gagarinAsPromise = new GagarinAsPromise(options, Promise.all([

    buildAsPromise(options.pathToApp), mongoServerPromise

  ]).then(function (all) {

    var pathToMain = all[0];

    env.MONGO_URL = 'mongodb://localhost:' + all[1].port + '/' + options.dbName;

    return new Promise(function (resolve, reject) {
      var nodePath = path.join(tools.getUserHome(), '.meteor', 'tools',  release.tools, 'bin', 'node');
      
      var meteor = null;
      var meteorPromise = null;
      var meteorNeedRestart = true;
      var meteorRestartTimeout = 0;

      function meteorAsPromise () {

        if (!meteorNeedRestart && meteorPromise) {
          return meteorPromise;
        }

        console.log('starting meteor again');

        meteorNeedRestart = false;
        meteorPromise = new Promise(function (resolve, reject) {

          meteor && meteor.kill('SIGINT');

          setTimeout(function () {
            //process.on('exit', function () {
            //  meteor && meteor.kill();
            //  meteor = null;
            //});

            meteor = spawn(nodePath, [ pathToMain ], { env: env });

            meteor.stdout.on('data', function (data) {
              var match = /Gagarin listening at port (\d+)/.exec(data.toString());
              if (match) {
                meteor.gagarinPort = parseInt(match[1]);
                resolve(meteor);
              }
            });

            setTimeout(function () {
              meteor.kill('SIGINT');
              reject(new Error('Gagarin is not there. Make sure you have added it with: mrt install gagarin.'));
            }, options.timeout || 10000);

          }, meteorRestartTimeout);


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
          return mongo.connect(mongoServerPromise, options.dbName).then(function (db) {
            return db.drop();
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

[ 'eval', 'promise', 'exit', 'start', 'restart' ].forEach(function (name) {
  GagarinAsPromise.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    return new GagarinAsPromise(self._options, self._operand, Promise.all([ self._operand, self._promise ]).then(function (all) {
      return all[0][name].apply(all[0], args);
    }));
  };
});

