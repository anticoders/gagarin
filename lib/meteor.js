
var MongoServerAsPromise = require('./mongo');
var MeteorTransponder    = require('./transponder');
var MeteorAsPromise      = require('./meteorAsPromise');
var BuildAsPromise       = require('./build');
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

var promiseChainMethods = [
  'execute',
  'promise',
  'wait',
  'exit',
  'start',
  'restart',
];

//-------
// METEOR
//-------

function Meteor (options) {

  var mongoServerPromise = null;

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

  var closure = {};
  var release = tools.getReleaseConfig(options.pathToApp);
  var env     = Object.create(process.env);

  env.ROOT_URL = options.location;
  env.PORT     = options.port;

  mongoServerPromise = new MongoServerAsPromise(options);

  this.location = options.location;

  this.getClosure = function () {
    return closure;
  };

  this.setClosure = function (_closure) {
    closure = _closure;
  };

  this.meteorProcessAsPromise = Promise.all([

    BuildAsPromise(options.pathToApp), mongoServerPromise

  ]).then(function (all) {

    var pathToMain = all[0];

    env.MONGO_URL = all[1] + '/' + options.dbName;

    return new Promise(function (resolve, reject) {
      
      var nodePath = tools.getNodePath(options.pathToApp);
      var meteor = null;
      var lastError = "";
      var lastErrorAt = "nowhere";
      var meteorPromise = null;
      var meteorHasCrashed = false;
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

      function requestGagarinConfig (meteorNeedRestart, meteorRestartTimeout) {

        if (meteorHasCrashed && !meteorNeedRestart) {
          if (lastError) {
            return Promise.reject(new Error(chalk.red(lastError) + chalk.blue(' => ') + chalk.blue(lastErrorAt)));
          }
          return Promise.reject(new Error(chalk.red('Meteor server has crashed due to some unknown reason.')));  
        }

        if (!meteorHasCrashed && !meteorNeedRestart && meteorPromise) {
          return meteorPromise;
        }

        meteorPromise = new Promise(function (resolve, reject) {

          cleanUpThen(function respawn() {

            setTimeout(function () {

              meteorSafetyTimeout = setTimeout(function () {
                cleanUpThen(function () {
                  reject(new Error('Gagarin is not there.' +
                    ' Please make sure you have added it with: meteor add anti:gagarin.'));
                });
              }, options.safetyTimeout || 10000);

              meteorHasCrashed = false
              
              meteor = spawn(nodePath, [ pathToMain ], { env: env });

              meteor.stdout.on('data', function (data) {
                //process.stdout.write(data);
                var match = /Gagarin listening at port (\d+)/.exec(data.toString());
                if (match) {
                  // make sure we won't kill this process by accident
                  clearTimeout(meteorSafetyTimeout);
                  meteorSafetyTimeout = null;
                  resolve({
                    gagarinPort   : parseInt(match[1]),
                    exitAsPromise : makeExitAsPromise(meteor, mongoServerPromise, options.dbName, cleanUpThen),
                    getClosure    : function () {
                      return closure;
                    },
                  });
                }
              });

              meteor.stderr.on('data', function (data) {

                // seek for errors

                data.toString().split('\n').forEach(function (line) {

                  var hasMatch = [

                    {
                      regExp: /Error\:\s*(.*)/,
                      action: function (match) {
                        lastError   = match[1];
                        lastErrorAt = '';
                      },
                    },

                    {
                      regExp: /at\s.*/,
                      action: function (match) {
                        if (!lastErrorAt) {
                          lastErrorAt = match[0];
                        }
                      },
                    },

                  ].some(function (options) {
                    var match = options.regExp.exec(line);
                    if (match) {
                      options.action.call(null, match);
                      return true;
                    }
                  });

                  if (lastError && !hasMatch) {
                    lastError += '\n' + line;
                  }

                });

                // process.stdout.write(chalk.red(data));
              });

              meteor.on('exit', function (code) {
                meteorHasCrashed = code !== 0;
                //----------------------------
                meteorPromise = null;
                meteor = null;
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

      //---------------------------------------------------
      resolve(new MeteorTransponder(requestGagarinConfig));

    });

  });
}

promiseChainMethods.forEach(function (name) {

  Meteor.prototype[name] = function () {
    var chain = new MeteorPromiseChain(this.meteorProcessAsPromise);
    return chain[name].apply(chain, arguments);
  };

});

// HELPERS

function makeExitAsPromise(meteorProcess, mongoServerPromise, databaseName, teardownRoutine) {

  return function exitAsPromise () {
    return new Promise(function (resolve, reject) {
      meteorProcess.once('error', reject);
      teardownRoutine(resolve);
    }).then(function () {
      return mongoServerPromise.connectToDB(databaseName).then(function (db) {
        return new Promise(function (resolve, reject) {
          db.dropDatabase(either(reject).or(resolve));
        });
      });
    });
  };

}

//---------------------
// METEOR PROMISE CHAIN
//---------------------

function MeteorPromiseChain (operand) {
  this._operand = operand;
  this._promise = operand;
}

[ 'then', 'catch' ].forEach(function (name) {

  MeteorPromiseChain.prototype[name] = function () {
    this._promise = this._promise[name].apply(this._promise, arguments);
    return this;
  };

});

MeteorPromiseChain.prototype.always = function (callback) {
  return this.then(callback, callback);
};

MeteorPromiseChain.prototype.sleep = function (timeout) {
  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

MeteorPromiseChain.prototype.expectError = function (callback) {
  var self = this;
  return self.then(function () {
    throw new Error('exception was not thrown');
  }, callback);
};

promiseChainMethods.forEach(function (name) {

  /**
   * Update the current promise and return this to allow chaining.
   */
  MeteorPromiseChain.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    self._promise = Promise.all([
      self._operand, self._promise
    ]).then(function (all) {
      // use the promise returned by operand
      return all[0][name].apply({}, args);
    });
    return self;
  };

});

