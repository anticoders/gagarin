'use strict';

// This code is based on:
// https://github.com/gruntjs/grunt-cli/blob/master/bin/grunt

// NOTE: we want to handle the following two scenarios

// project/
//   gagarin.yaml
//   node_modules/
//     gagarin
// test(s)/
//   ...

// project/
//   gagarin.yaml
//   test(s)/
//     node_modules/
//       gagarin
//     ...

var resolve = require('resolve');
var findUp  = require('find-up');
var path    = require('path');
var utils   = require('./utils');
var chalk   = require('chalk');

exports.run = function (basedir) {

  // TODO: change the name to "gagarin" when the meta package is ready
  var packageName = 'gagarin-core';

  utils.stopOnFirstSuccess([
    
    resolve.bind({}, packageName, { basedir: basedir }),
    resolve.bind({}, packageName, { basedir: path.join(basedir, 'tests') }),
    resolve.bind({}, packageName, { basedir: path.join(basedir, 'test')  }),

    utils.promiseAsThunk(findUp.bind({}, 'lib/gagarin.js')),

  ], function (err, pathToGagarin) {

    if (err || !pathToGagarin) {
      console.log(chalk.red('gagarin-cli:'), 'Unable to find local gagarin.');
      if (err) {
        console.log(chalk.red('gagarin-cli:'), err.stack);
      }
      return;
    }

    console.log(chalk.green('gagarin-cli:'),
      'Found local gagarin at: ' + chalk.magenta(pathToGagarin));

    require(pathToGagarin).cli(basedir).catch(function (err) {
      console.log(chalk.red('gagarin-cli:'), err.stack);
    });

  });
};
