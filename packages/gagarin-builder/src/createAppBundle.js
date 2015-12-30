import * as common from 'gagarin-common';
import {resolve as pathResolve, join as pathJoin} from 'path';
import {spawn} from 'child_process';
import linkNodeModules from 'linkNodeModules';

export default function createAppBundle (pathToApp, options) {

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

  let timeout = options.timeout   || 120000;

  let pathToMain  = pathJoin(pathToApp, '.gagarin', 'local', 'bundle', 'main.js');
  let pathToLocal = pathJoin(pathToApp, '.gagarin', 'local');
  let isSilent    = !!options.isSilent;

  let env = Object.create(process.env);

  return common.getMeteorVersion(pathToApp).then(version => {

    return new Promise((resolve, reject) => {

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

      let buildTimeout = null;

      // NOTE: this is a Promise
      let meteorBinary = common.getMeteorBinary();
      //make sure that platforms file contains only server and browser
      //and cache this file under platforms.gagarin.backup
      let platformsFilePath = pathJoin(pathToApp,'.meteor','platforms');
      let platformsBackupPath = pathJoin(pathToApp,'.meteor','platforms.gagarin.backup');

      fs.rename(platformsFilePath,platformsBackupPath,function(err,data){
        fs.writeFile(platformsFilePath,'server\nbrowser\n',function(){
          spawnMeteorProcess();
        });
      });

      function spawnMeteorProcess () {

        meteor = spawn(meteorBinary, args, {
          cwd: pathToApp, env: env, stdio: isSilent ? 'ignore' : 'inherit'
        });

        meteor.on('exit', function onExit (code) {
          //switch back to initial content of platforms file
          fs.rename(platformsBackupPath,platformsFilePath);
          if (code) {
            return reject(new Error('meteor build exited with code ' + code));
          }

          logs.system('linking node_modules');

          linkNodeModules(pathToApp).then(function () {

            logs.system('everything is fine');
            resolve(pathToMain);

          }).catch(reject);

          buildTimeout = setTimeout(function () {
            meteor.once('exit', function () {
              reject(new Error('Timeout while waiting for meteor build to finish.'));
            });
            meteor.kill('SIGINT')
          }, timeout);

          clearTimeout(buildTimeout);
        });
      }

    });
  });
}
