#!/usr/bin/env node

// This code is based on:
//
// https://github.com/gruntjs/grunt-cli/blob/master/bin/grunt

process.title = 'gagarin';

import resolve from 'resolve';
import findUp from 'find-up';
import {join} from 'path';
import {asPromise} from './utils';

(async function () {

  let pathToGagarin = '';

  for (let promise of iterator()) {
    try {
      pathToGagarin = await promise;
      if (pathToGagarin) {
        break;
      }
    } catch (err) {
      // ignore
    }
  }

  if (!pathToGagarin) {
    // TODO: print some instructions
    console.log('Unable to find local gagarin.');
  } else {
    await require(pathToGagarin).cli();
  }
}().catch(function (err) {
  console.log(err.stack);
}));

function* iterator() {
  let basedir = process.cwd();

  yield asPromise(resolve)('gagarin', { basedir: basedir });
  yield asPromise(resolve)('gagarin', { basedir: join(basedir, 'tests') });
  yield findUp('lib/gagarin.js');
}
