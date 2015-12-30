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

export async function checkPathExists (path) {
  return !!(await getFileStatOrNull(path));
};

export async function checkPathIsDirectory (path) {
  var stat = await getFileStatOrNull(path);
  if (!stat) {
    return false;
  }
  return stat.isDirectory();
};

function getFileStatOrNull (path) {
  return new Promise((resolve, reject) => {
    fileStat(path, (err, stat) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // file does not exist
          return resolve(null);
        } else {
          return reject(err);
        }
      }
      resolve(stat);
    });
  });
}
