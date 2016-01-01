import {join as pathJoin, extname} from 'path';
import {readFile, stat as fileStat} from 'fs';
import {memoize} from './utils';

export const getNodePath = memoize(function (pathToApp) {
  var pathToBuildArtifact = pathJoin(pathToApp, '.gagarin', 'local', 'gagarin.pathToNode');
  return new Promise((resolve, reject) => {
    readFile(pathToBuildArtifact, { encoding: 'utf8' }, function (err, data) {
      if (err) {
        if (err.code === 'ENOENT') {
          err = new Error(`The file ${pathToBuildArtifact} does not exist!
\tThis may be caused by several things:
\t(1) your app does not build properly,
\t(2) package gagarin:builder is not installed,
\t(3) package gagarin:builder is in wrong version`);
        }
        return reject(err);
      }
      // let's trim it ... just in case ...
      resolve(data.trim());
    });
  });
});

export const getDevBundlePath = memoize(function (pathToApp) {
  return getNodePath(pathToApp)
    .then(pathToNode => {

      let pattern = 'dev_bundle';
      let match   = pathToNode && pathToNode.match(pattern);

      if (!match) {
        throw new Error('invalid build artifact: ' + pathToNode);
      }

      return pathToNode.substr(0, match.index + pattern.length);
    });
});

export const getMongoPath = memoize(function (pathToApp) {
  return Promise.all([

    getNodePath(pathToApp),
    getDevBundlePath(pathToApp)

  ]).then(results => {

    let pathToNode      = results[0];
    let pathToDevBundle = results[1];

    return pathJoin(pathToDevBundle,  'mongodb', 'bin', 'mongod') + extname(pathToNode);
  });
});

export const getMeteorBinary = memoize(function () {

  // Windows may require an extension when spawning executable files,
  // all known other platforms don't.
  if (process.platform !== 'win32') {
    return Promise.resolve('meteor');
  }

  // Meteor for Windows is a .bat file, living in AppData/Local/.meteor check
  // if it exists, or return without extension to try .exe fallback. Just in
  // case MDG might decide to provide an exe instead of bat file in future versions.
  // see https://github.com/meteor/windows-preview/issues/73#issuecomment-76873375

  let meteorPath = pathJoin(process.env.LOCALAPPDATA, '.meteor');

  return new Promise((resolve, reject) => {
    // according to:
    //
    // http://stackoverflow.com/questions/17699599/node-js-check-exist-file
    //
    // this is the standard way to test file existance; note that "fs.exists"
    // is now deprecated ...

    checkPathExists(pathJoin(meteorPath, 'meteor.bat'), (err, exists) => {
      if (err) {
        reject(err);
      } else {
        resolve(exists ? 'meteor.bat' : 'meteor');
      }
    });
  });
});

export const getPathToDB = memoize(function (pathToApp) {
  return Promise.resolve(pathJoin(pathToApp, '.gagarin', 'local', 'db'));
});

export const getPathToGitIgnore = memoize(function (pathToApp) {
  return Promise.resolve(pathJoin(pathToApp, '.gagarin', '.gitignore'));
});
