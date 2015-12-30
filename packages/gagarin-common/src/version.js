import {join as pathJoin} from 'path';
import {readFile} from 'fs';
import {memoize} from './utils';

export function getGagarinPackageVersion(pathToApp) {

  var pathToMeteorPackages = pathJoin(pathToApp, '.meteor', 'packages');

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

export const getMeteorReleaseName = memoize(function (pathToApp) {
  var pathToRelease = pathJoin(pathToApp, '.meteor', 'release');
  return new Promise((resolve, reject) => {
    readFile(pathToRelease, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.replace(/\s/g, ''));
    });
  });
});

export const getMeteorVersion = memoize(function (pathToApp) {
  return getMeteorReleaseName(pathToApp).then(releaseName => {
    return parseRelease(releaseName);
  });
});

// since 0.9.0, the format is METEOR@x.x.x
function parseRelease(release) {
  return release.split('@')[1] || release;
}

