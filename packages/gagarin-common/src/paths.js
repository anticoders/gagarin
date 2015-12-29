import {join as pathJoin, extname} from 'path';
import {readFile, stat as fileStat} from 'fs';

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

export const getProbeJson = memoize(function (pathToApp) {
  var pathToProbeJson = pathJoin(pathToApp, '.gagarin', 'local', 'probe.json');
  return new Promise((resolve, reject) => {
    readFile(pathToProbeJson, { encoding: 'utf8' }, function (err, data) {
      if (err) {
        if (err.code === 'ENOENT') {
          err = new Error(`The file ${pathToProbeJson} does not exist!
\tThis may be caused by several things:
\t(1) your app does not build properly,
\t(2) you forgot to add anti:gagarin to your app,
\t(3) anti:gagarin is at version < 0.4.6.`);
        }
        return reject(err);
      }
      resolve(JSON.parse(data));
    });
  });
});

export const getDevBundlePath = memoize(function (pathToApp) {
  return getProbeJson(pathToApp)
    .then(probe => {

      // in the future the probe.json should contain pathToNode ...
      // below is a temporary workaround to make it work on windows

      let pattern = 'dev_bundle';
      let match   = probe.pathToNode && probe.pathToNode.match(pattern);

      if (!match) {
        throw new Error('invalid build probe.json: ' + probe.pathToNode);
      }

      return probe.pathToNode.substr(0, match.index + pattern.length);
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

export const getNodePath = memoize(function (pathToApp) {
  return getProbeJson(pathToApp)
    .then(probe => {
      // XXX: this one would not work on windows, because of missing ".exe"
      // return pathJoin(pathToDevBundle, 'bin', 'node');
      return probe.pathToNode;
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

// since 0.9.0, the format is METEOR@x.x.x
function parseRelease(release) {
  return release.split('@')[1] || release;
}

function memoize (func) {
  let cache = {};
  return function (string) {
    if (!cache[string]) {
      cache[string] = func.apply(this, arguments);
    }
    return cache[string];
  };
}
