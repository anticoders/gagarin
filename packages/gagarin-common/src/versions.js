import {join} from 'path';
import {readFile} from 'fs';

export function getGagarinPackageVersion(pathToApp) {

  var pathToMeteorPackages = join(pathToApp, '.meteor', 'packages');

  return new Promise(function (resolve, reject) {
    readFile(pathToMeteorPackages, { encoding: 'utf-8' }, function (err, content) {
      if (err) {
        // this should not happend ...
        return reject(err);
      }
      var match = content.match(/anti:gagarin@=(.*)/);
      // if we dont find a match, then either gagarin is not
      // added or the version is not specified explicitly,
      // which is still wrong
      resolve(match && match[1]);
    });
  });
}
