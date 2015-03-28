var Promise = require('es6-promise').Promise;
var tools   = require('../tools');
var path    = require('path');
var fs      = require('fs');

/**
 * Make sure that in the builded app there is a proper link to "node_modules"
 * take from dev bundle. We might as well run "npm install" inside "bundle/programs/server"
 * but this is both slower and more error-prone.
 *
 * One thing to note here is that we are using "getPathToDevBundle" which requires
 * ".gagarin/local/artifacts.json" to exists, so you cannot run this function unless you build first.
 *
 * @param {string} pathToApp
 */
module.exports = function linkNodeModules (pathToApp) {

  return tools.getPathToDevBundle(pathToApp).then(function (getPathToDevBundle) {

    return new Promise(function (resolve, reject) {

      var pathToServerNodeModules = path.join(getPathToDevBundle, 'server-lib', 'node_modules');
      var pathToServerPrograms    = path.join(pathToApp, '.gagarin', 'local', 'bundle', 'programs', 'server');
      var retryCount              = 0;

      (function retry(pathToNodeModules) {
        checkIfExists(pathToNodeModules, function (err) {
          if (err) {
            if (++retryCount <= 1) {
              // in older meteor releases we used to have node modules in a different dir
              return retry(pathToNodeModules.replace('server-lib', 'lib'));
            }
            return reject(err);
          }
          createSymlink(pathToNodeModules, pathToServerPrograms);
        });
      })(pathToServerNodeModules);

      function checkIfExists(pathToNodeModules, cb) {
        fs.stat(pathToNodeModules, function (err, stats) {
          if (err || !stats.isDirectory()) {
            return cb(err || new Error('node_modules is not a directory'));
          }
          cb();
        });
      }

      function createSymlink(from, to) {
        fs.symlink(from, path.join(to, 'node_modules'), function (err) {
          if (err) {
            if (err.code === 'EEXIST') {
              // looks like "node_modules" dir already exists ... that's fine ...
              resolve();
            }
            return reject(err);
          }
          resolve();
        });
      }

    });

  });

}
