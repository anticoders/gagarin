import {launch} from 'gagarin-launch-control';
import {asPromise, checkPathExists} from 'gagarin-common';
import {resolve as pathResolve} from 'path';
import {writeFile, readFile} from 'fs';

export default async function (options) {
  
  let pathToGagarinJson = pathResolve(options.directory, 'gagarin.json');

  if (!await checkPathExists(pathToGagarinJson)) {
    console.log('File gagarin.json does not exist. Please run "gagarin init" first.');
    return;
  }

  let config = JSON.parse(await asPromise(readFile)(pathToGagarinJson, 'utf8'));

  await launch({
    directory : options.directory,
    processes : config.processes,
  });
}
