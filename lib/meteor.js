
var MongoServerAsPromise = require('./mongo');
var MeteorPromiseChain   = require('./meteorPromiseChain');
var MeteorTransponder    = require('./transponder');
var BuildAsPromise       = require('./build');
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

  var accessor = function () { return arguments.length === 0 ? {} : undefined };
  var release  = tools.getReleaseConfig(options.pathToApp);
  var env      = Object.create(process.env);

  env.ROOT_URL = options.location;
  env.PORT     = options.port;

  mongoServerPromise = new MongoServerAsPromise(options);

  this.location = options.location;

  this.useClosure = function (objectOrGetter) {
    if (typeof objectOrGetter !== 'function' && typeof objectOrGetter !== 'object') {
      throw new Error('closure must be either function or object');
    }
    accessor = function (values) {
      var closure = (typeof objectOrGetter === 'function') ? objectOrGetter() : objectOrGetter;
      if (arguments.length === 0) {
        return closure ? closure.getValues() : {};
      }
      closure && closure.setValues(values);
    }
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
                    exitAsPromise : makeExitAsPromise(meteor, mongoServerPromise, options.dbName, cleanUpThen),
                    gagarinPort   : parseInt(match[1]),
                    closure       : function () {
                      // XXX note that accessor may change dynamically
                      return accessor.apply(this, arguments);
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

MeteorPromiseChain.methods.forEach(function (name) {
  "use strict";

  Meteor.prototype[name] = function () {
    var chain = new MeteorPromiseChain(this.meteorProcessAsPromise);
    return chain[name].apply(chain, arguments);
  };

});

// HELPERS

function makeExitAsPromise(meteorProcess, mongoServerPromise, databaseName, teardownRoutine) {
  "use strict";

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
