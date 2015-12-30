import * as common from 'gagarin-common';
import {spawn} from 'child_process';

/**
 * Check smart package version and if it's wrong, install the right one.
 *
 * @param {string} pathToApp
 */
export function ensureGagarinVersionsMatch (pathToApp, verbose) {

  var pathToMeteorPackages = path.join(pathToApp, '.meteor', 'packages');
  var nodeModuleVersion    = require('../../package.json').version;

  return new Promise(function (resolve, reject) {

    common.getGagarinPackageVersion(pathToApp).then(function (packageVersion) {

      if (packageVersion === nodeModuleVersion) {
        logs.system("node module and smart package versions match, " + packageVersion);
        return resolve();
      }

      common.getMeteorVersion(pathToApp).then(function (meteorReleaseVersion) {

        if (meteorReleaseVersion < "0.9.0") {
          // really, we can do nothing about package version
          // without a decent package management system
          logs.system("meteor version is too old to automatically fix package version");
          return resolve();
        }

        logs.system("meteor add anti:gagarin@=" + nodeModuleVersion);

        var meteor = spawn('meteor', [ 'add', 'anti:gagarin@=' + nodeModuleVersion ], {

          stdio: verbose ? 'inherit' : 'ignore', cwd: pathToApp
        });

        meteor.on('error', reject);

        meteor.on('exit', function (code) {
          if (code > 0) {
            return reject(new Error('meteor exited with code ' + code));
          }
          logs.system("anti:gagarin is know in version " + nodeModuleVersion);
          resolve();
        });

      }).catch(reject);

    }).catch(reject);

  }); // Promise
}
