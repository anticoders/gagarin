import {checkPathExists} from './check';
import {getPathToGitIgnore} from './paths';
import {asPromise} from './utils';
import {dirname} from 'path';
import {stat as fileStat, writeFile} from 'fs';
import mkdirp from 'mkdirp';

/**
 * A thin wrapper around "mkdirp".
 * @param {String} path
 * @returns {Promise}
 */
export function ensureDirectoryExists (path) {
  return asPromise(mkdirp)(path);
};

/**
 * Check if /.gagarin/.gitignore exists. If not, create it.
 * @param {String} pathToApp
 */
export async function ensureGagarinGitIgnore (pathToApp) {
  
  var pathToGitIgnore = await getPathToGitIgnore(pathToApp);
  var exists          = await checkPathExists(pathToGitIgnore);

  if (!exists) {
    await ensureDirectoryExists(dirname(pathToGitIgnore));
    await asPromise(writeFile)(pathToGitIgnore, 'local', { encoding: 'utf8' });
  }
};
