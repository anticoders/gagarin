var Promise = require('es6-promise').Promise;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

module.exports = {

  getReleaseConfig: function (pathToApp) {
    var pathToRelease = path.join(pathToApp, '.meteor', 'release'), release = 'latest';
    if (fs.existsSync(pathToRelease)) {
      release = parseRelease(fs.readFileSync(pathToRelease).toString('utf8').replace(/\s/g, ''));
    }
    var pathToReleaseConfig = path.join(
      module.exports.getUserHome(), '.meteor', 'releases', release + '.release.json');
    //--------------------------------------------------------------------------------
    var config = { tools: 'latest' };
    if (fs.existsSync(pathToReleaseConfig)) {
      config = JSON.parse(fs.readFileSync(pathToReleaseConfig).toString('utf8'));
    }
    config.release = release;
    return config;
  },

  getUserHome: function () {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  },

  getMongoPath: function (pathToApp) {
    var config = module.exports.getReleaseConfig(pathToApp);
    var home = module.exports.getUserHome();
    if (config.release < "0.9.0") {
      return path.join(home, '.meteor', 'tools', config.tools, 'mongodb', 'bin', 'mongod');
    }
    var pathToMeteor = path.join(home, '.meteor');
    var meteorSymLink = path.join(pathToMeteor, fs.readlinkSync(path.join(pathToMeteor, 'meteor')));
    return '/' + path.join.apply(path, initial(meteorSymLink.split(path.sep)).concat([
      'dev_bundle', 'mongodb', 'bin', 'mongod'
    ]));
  },

  getNodePath: function (pathToApp) {
    var config = module.exports.getReleaseConfig(pathToApp);
    var home = module.exports.getUserHome();
    if (config.release < "0.9.0") {
      return path.join(home, '.meteor', 'tools', config.tools, 'bin', 'node');
    }
    var pathToMeteor = path.join(home, '.meteor');
    var meteorSymLink = path.join(pathToMeteor, fs.readlinkSync(path.join(pathToMeteor, 'meteor')));
    return '/' + path.join.apply(path, initial(meteorSymLink.split(path.sep)).concat([
      'dev_bundle', 'bin', 'node'
    ]));
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
      var meteorite;

      try {
        meteorite = spawn('mrt', [ 'install' ], { cwd: pathToApp });
      } catch (err) {

        return reject(err);
      }

      meteorite.on('exit', module.exports.either(function (code) {
        reject(new Error('Bad luck, meteorite exited with code: ' + code));
      }).or(resolve));

      // TODO: timeout

    });
  },

};

// since 0.9.0, the format is METEOR@x.x.x
function parseRelease(release) {
  return release.split('@')[1] || release;
}

function initial(array) {
  return array.slice(0, array.length - 1);
}

