import pm2 from 'pm2';
import {asPromise, getNodePath} from 'gagarin-common';
import {createAppBundle} from 'gagarin-builder';
import {resolve as pathResolve} from 'path';

export async function launch (options) {
  
  let directory = options.directory;
  let processes = options.processes || [];
  let pathToApp;
  let pathToAppBundle;
  let pathToNode;

  console.log('launching with options', options);
 
  await asPromise(pm2.connect)();
  console.log('connected to pm2');

  try {
    for (let p of options.processes) {
      switch (p.type) {
        case 'meteor':
          pathToApp       = pathResolve(directory, p.path || '.');
          pathToAppBundle = await createAppBundle(pathToApp);
          pathToNode      = await getNodePath(pathToNode);

          await asPromise(pm2.start)({
            script           : pathToAppBundle,
            exec_interpreter : pathToNode,
          });
          break;
        default:
          console.log('unknown process type:', p.type);
        // case 'mongod':
      }
    }
  
    console.log('started all process');

  } catch (err) {
    console.log(err.stack);
  } finally {
    await asPromise(pm2.disconnect());
    console.log('disconnected from pm2');
  }
};
