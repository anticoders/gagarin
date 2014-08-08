var Promise = require('es6-promise').Promise;
var path = require('path');
var fs = require('fs');
var colors = require('colors');
var spawn = require('child_process').spawn;

var myBuildPromise = null;

module.exports = {
  
  getConfig: function () {
    var data;
    var path = './.gagarin/gagarin.json';
    if (fs.existsSync(path)) {
      data = fs.readFileSync(path);
      data = JSON.parse(data);
    }
    return data || {};
  },

  getReleaseConfig: function (pathToApp) {
    var pathToRelease = path.join(pathToApp, '.meteor', 'release'), release = 'latest';
    if (fs.existsSync(pathToRelease)) {
      release = fs.readFileSync(pathToRelease).toString('utf8').replace(/\s/g, '');
    }
    var pathToReleaseConfig = path.join(
      module.exports.getUserHome(), '.meteor', 'releases', release + '.release.json');
    //--------------------------------------------------------------------------------
    if (fs.existsSync(pathToReleaseConfig)) {
      return JSON.parse(fs.readFileSync(pathToReleaseConfig).toString('utf8'));
    }
    return { tools: 'latest' };
  },

  getUserHome: function () {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  },

  either: function (first) {
    return {
      or: function (second) {
        return function (arg1, arg2) {
          return arg1 ? first(arg1) : second(arg2);
        };
      }
    };
  },

  smartPackagesAsPromise: function (pathToApp) {
    return new Promise(function (resolve, reject) {
      var meteorite = spawn('mrt', [ 'install' ], { cwd: pathToApp });

      meteorite.on('exit', function (code) {
        if (code) {
          reject(new Error('Bad luck, meteorite exited with code: ' + code));
        } else {
          resolve();
        }
      });

      // TODO: timeout

    });
  },

  buildAsPromise: function (pathToApp, timeout) {

    var pathToSmartJson = path.join(pathToApp, 'smart.json');
    var pathToMongoLock = path.join(pathToApp, '.meteor', 'local', 'db', 'mongod.lock');
    var pathToMain      = path.join(pathToApp, '.meteor', 'local', 'build', 'main.js');

    if (fs.existsSync(pathToMongoLock) && fs.readFileSync(pathToMongoLock).toString('utf8')) {
      if (fs.existsSync(pathToMain)) {
        return Promise.resolve(pathToMain);
      } else {
        return Promise.reject(new Error('The meteor build does not seem to exist even though the meteor is running.'));
      }
    }

    if (myBuildPromise) return myBuildPromise;

    var env = Object.create(process.env);
    var port = 4000 + Math.floor(Math.random() * 1000);

    // we don't want to have a real database here, just want the build process to finish
    env.MONGO_URL = 'mongodb://localhost:' + port + '/there_should_be_no_database_on_this_port';

    function buildPromiseFuncion(resolve, reject) {
      var meteor = spawn('meteor', [
        '--production',
        '--port', port
      ], { cwd: pathToApp, env: env });
      //----------------------------------------
      meteor.stdout.on('data', function (data) {
        var match = /App running at:/.exec(data.toString());
        if (match) {
          meteor.once('exit', function () {
            if (fs.existsSync(pathToMain)) {
              resolve(pathToMain);
            } else {
              reject(new Error('Meteor build failed.'));
            }
          });
          meteor.kill('SIGINT');
        }
      });

      meteor.stdout.on('error', function (data) {
        console.log(data.toString().red);
      });

      setTimeout(function () {
        meteor.once('exit', function () {
          reject(new Error('Failed to start meteor.'));
        });
        meteor.kill('SIGINT')
      }, timeout || 60000);

    }

    if (fs.existsSync(pathToSmartJson)) {
      myBuildPromise = module.exports.smartPackagesAsPromise(pathToApp).then(function () {
        return new Promise(buildPromiseFuncion);
      });
    } else {
      myBuildPromise = new Promise(buildPromiseFuncion);
    }

    return myBuildPromise;
  },

};
