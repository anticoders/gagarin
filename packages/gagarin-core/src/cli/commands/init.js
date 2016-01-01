import {asPromise, checkPathExists} from 'gagarin-common';
import {resolve as pathResolve} from 'path';
import {writeFile} from 'fs';

export default async function (options) {

  let pathToGagarinJson = pathResolve(options.directory, 'gagarin.json');

  if (await checkPathExists(pathToGagarinJson)) {
    console.log('File gagarin.json already exists.');
    return;
  }

  let content = JSON.stringify({
    "processes": [
      {
        "name": "db",
        "type": "mongod"
      },
      {
        "name": "app",
        "type": "meteor"
      }
    ]
  }, null, 2);

  await asPromise(writeFile)(pathToGagarinJson, content, 'utf8');
}
