var Promise = require('es6-promise').Promise;
var path = require('path');
var fs = require('fs');
var colors = require('colors');
var spawn = require('child_process').spawn;

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

  getMongoPath: function (pathToApp) {
    var release = module.exports.getReleaseConfig(pathToApp);
    return path.join(module.exports.getUserHome(), '.meteor', 'tools', release.tools, 'mongodb', 'bin', 'mongod');
  },

  getNodePath: function (pathToApp) {
    var release = module.exports.getReleaseConfig(pathToApp);
    return path.join(module.exports.getUserHome(), '.meteor', 'tools', release.tools, 'bin', 'node');
  },

  getPathToDB: function (pathToApp) {
    return path.join(pathToApp || module.exports.getUserHome(), '.gagarin', 'local', 'db');
  },

  getPathToGitIgnore: function (pathToApp) {
    return path.join(pathToApp || module.exports.getUserHome(), '.gagarin', '.gitignore');
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

  exitAsPromise: function (otherProcess) {
    return new Promise(function (resolve, reject) {
      otherProcess.once('error', reject);
      otherProcess.once('exit', resolve);
      otherProcess.kill();
    });
  },

  smartPackagesAsPromise: function (pathToApp) {
    return new Promise(function (resolve, reject) {
      var meteorite = spawn('mrt', [ 'install' ], { cwd: pathToApp });

      meteorite.on('exit', module.exports.either(function (code) {
        reject(new Error('Bad luck, meteorite exited with code: ' + code));
      }).or(resolve));

      // TODO: timeout

    });
  },

};
