
var MongoServerAsPromise = require('./mongo');
var GagarinTransponder   = require('./transponder');
var GagarinAsPromise     = require('./gagarinAsPromise');
var BuildAsPromise       = require('./build');
var Promise              = require('es6-promise').Promise;
var either               = require('./tools').either;
var spawn                = require('child_process').spawn;
var tools                = require('./tools');
var path                 = require('path');
var fs                   = require('fs');

module.exports                = Gagarin;
module.exports.BuildAsPromise = BuildAsPromise;
module.exports.MongoAsPromise = MongoServerAsPromise;

function Gagarin (options) {

  var mongoServerPromise = null;

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

  mongoServerPromise = new MongoServerAsPromise(options);

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
