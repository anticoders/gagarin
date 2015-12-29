import {readFile, stat as fileStat} from 'fs';
import {join} from 'path';

/**
 * Guess if "develop" meteor is currently running.
 *
 * @param {string} pathToApp
 */
export function checkMeteorIsRunning(pathToApp) {
  var pathToMongoLock = join(pathToApp, '.meteor', 'local', 'db', 'mongod.lock');
  return new Promise(function (resolve, reject) {
    readFile(pathToMongoLock, { encoding: 'utf8' }, function (err, data) {
      if (err) {
        // if the file does not exist, then we are ok anyway
        return err.code !== 'ENOENT' ? reject(err) : resolve();
      } else {
        // isLocked iff the content is non empty
        resolve(!!data);
      }
    });
  });
}

export function checkPathExists (path) {
  return new Promise((resolve, reject) => {
    fileStat(path, err => {
      if (err) {
        if (err.code === 'ENOENT') {
          return resolve(false);
        } else {
          return reject(err);
        }
      }
      resolve(true);
    });
  });
};
