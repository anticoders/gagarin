import * as common from 'gagarin-common';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Make sure that in the built application there is a proper link to "node_modules"
 * taken from Meteor's dev_bundle. We might as well run "npm install" inside "bundle/programs/server"
 * but this is both slower and more error-prone.
 *
 * One thing to note here is that we are using "getDevBundlePath" which requires
 * ".gagarin/local/gagarin.pathToNode" to exists, so you cannot run this function unless you build first.
 *
 * @param {string} pathToApp
 */
export default function linkNodeModules (pathToApp) {

  return common.getDevBundlePath(pathToApp).then(function (pathToDevBundle) {

    return new Promise(function (resolve, reject) {

      let pathToServerNodeModules = path.join(pathToDevBundle, 'server-lib', 'node_modules');
      let pathToServerPrograms    = path.join(pathToApp, '.gagarin', 'local', 'bundle', 'programs', 'server');
      let retryCount              = 0;

      (function retry(pathToNodeModules) {
        checkIfExists(pathToNodeModules, function (err) {
          if (err) {
            if (++retryCount <= 1) {
              // in older meteor releases we used to have node modules in a different directory
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
        // Don't create symlink in case of Windows platforms. Symlink creation
        // requires administrator rights. Besides, Windows can use the NODE_PATH
        // variable so symlinks aren't required. We should check if this can also
        // work for linux / macos. See NODE_PATH in meteorProcessManager/getMeteorProcess
        if (process.platform === 'win32') {
          return resolve();
        }

        // all other platforms create symlinks
        fs.symlink(from, path.join(to, 'node_modules'), function (err) {
          if (err) {
            if (err.code === 'EEXIST') {
              // looks like "node_modules" directory already exists ... that's fine ...
              resolve();
            }
            return reject(err);
          }
          resolve();
        });
      }
    });
  });
};
