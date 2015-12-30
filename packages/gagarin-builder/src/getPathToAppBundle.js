import * as common from 'gagarin-common';
import {join as pathJoin} from 'path';
import prepareAppBundle from 'prepareAppBundle';

// let logs                 = require('../logs');

let memoize = {};

export default function getPathToAppBundle (pathToApp, options) {

  if (!options) {
    options = pathToApp; pathToApp = null;
  }

  if (typeof options === 'string') {
    options = { pathToApp: options };
  }

  if (!pathToApp) {
    pathToApp = options.pathToApp;
  }

  let timeout  = options.timeout || 120000;
  let isSilent = !!options.isSilent;

  let pathToMain  = pathJoin(pathToApp, '.meteor', 'local', 'build', 'main.js');
  let pathToMain2 = pathJoin(pathToApp, '.gagarin', 'local', 'bundle', 'main.js');
  let skipBuild   = !!options.skipBuild;

  function checkMeteorDevBuild (message) {
    message = message || 'Cannot find main.js file.';
    return common.checkPathExists(pathToMain).then(exists => {
      if (!exists) {
        throw new Error(message);
      }
      logs.system('using ' + pathToMain);
      return pathToMain;
    });
  }

  if (memoize[pathToApp]) {
    return memoize[pathToApp];
  }

  memoize[pathToApp] = new Promise((resolve, reject) => {

    common.checkMeteorIsRunning(pathToApp).then(isRunning => {

      if (isRunning) {
        return checkMeteorDevBuild(`Even though meteor seems to be running,
the file ${pathToMain} does not exist.
Either, there is a stale mongod process, which you will have to kill,
or you may try removing '.meteor/local/db/mongo.lock' manually.
`);
      }

      if (skipBuild) {

        return common.checkPathExists(pathToMain2).then(exists => {
          if (exists) {
            logs.system('using ' + pathToMain2);
            return pathToMain2;
          } else {
            // as a fall-back solution try using main.js from develop mode
            return checkMeteorDevBuild('There is no build available, so you cannot "skip build" option.');
          }
        });
      }

      logs.system('running meteor build at ' + pathToApp);

      return prepareAppBundle({
        pathToApp : pathToApp,
        isSilent  : isSilent,
        timeout   : timeout,
      });

    }).then(resolve, reject);

  });

  return memoize[pathToApp];
};
