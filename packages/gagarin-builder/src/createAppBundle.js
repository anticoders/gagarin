import {resolve as pathResolve, join as pathJoin} from 'path';
import {rename, writeFile} from 'fs';
import {spawn} from 'child_process';
import linkNodeModules from './linkNodeModules';
import {
  logs, asPromise, getMeteorVersion, getMeteorBinary, ensureGagarinGitIgnore,
} from 'gagarin-common';

/**
 * Call "meteor build" and wait until it's done.
 * @param {String} pathToApp
 * @param {Object} options
 * @param {Boolean} options.isSilent - if true, don't show output from meteor process ...
 */
export default async function createAppBundle (pathToApp, options) {

  if (!options) {
    options = pathToApp; pathToApp = null;
  }

  if (typeof options === 'string') {
    options = { pathToApp: options };
  }

  if (!pathToApp) {
    pathToApp = options.pathToApp;
  }

  // it has to be absolute because we are going to use it as cwd
  // for meteor build in a moment ...
  pathToApp = pathResolve(pathToApp);

  let pathToMain  = pathJoin(pathToApp, '.gagarin', 'local', 'bundle', 'main.js');
  let pathToLocal = pathJoin(pathToApp, '.gagarin', 'local');
  let isSilent    = !!options.isSilent;

  let env = Object.create(process.env);

  let version = await getMeteorVersion(pathToApp);
  let binary  = await getMeteorBinary();

  let meteor = null;
  let args;

  logs.system("detected METEOR@" + version);

  if (version >= '1.0.0') {
    args = [ 'build', '--debug', '--directory', pathToLocal ];
  } else {
    args = [ 'bundle', '--debug', '--directory', pathJoin(pathToLocal, 'bundle') ];
  }

  logs.system("spawning meteor process with the following arguments");
  logs.system(JSON.stringify(args));

  //make sure that platforms file contains only server and browser
  //and cache this file under platforms.gagarin.backup
  let platformsFilePath = pathJoin(pathToApp,'.meteor','platforms');
  let platformsBackupPath = pathJoin(pathToApp,'.meteor','platforms.gagarin.backup');

  await asPromise(rename)(platformsFilePath, platformsBackupPath);
  await asPromise(writeFile)(platformsFilePath, 'server\nbrowser\n', { encoding: 'utf8' });

  meteor = spawn(binary, args, {
    cwd: pathToApp, env: env, stdio: isSilent ? 'ignore' : 'inherit'
  });

  await new Promise((resolve, reject) => {
    // TODO: maybe implement timeout?
    meteor.on('exit', function onExit (code) {
      if (code) {
        reject(new Error('meteor build exited with code ' + code));
      } else {
        resolve();
      }
    });
  });

  // switch back to the initial content of platforms file
  await asPromise(rename)(platformsBackupPath,platformsFilePath);

  logs.system('linking node_modules');

  // NOTE: this will not work without "probe.json" file
  await linkNodeModules(pathToApp);

  logs.system('everything is fine');

  return pathToMain;
}
