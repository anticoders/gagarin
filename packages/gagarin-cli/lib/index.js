'use strict';

// This code is based on:
// https://github.com/gruntjs/grunt-cli/blob/master/bin/grunt

var resolve = require('resolve');
var findUp  = require('find-up');
var path    = require('path');
var utils   = require('./utils');
var chalk   = require('chalk');

exports.run = function (basedir) {
  utils.stopOnFirstSuccess([
    
    resolve.bind({}, 'gagarin', { basedir: basedir }),
    resolve.bind({}, 'gagarin', { basedir: path.join(basedir, 'tests') }),
    utils.promiseAsThunk(findUp.bind({}, 'lib/gagarin.js')),

  ], function (err, pathToGagarin) {

    if (err) {
      console.log(chalk.red('Unable to find local gagarin.'));
      throw err;
    }

    console.log('Found local gagarin at: ' + chalk.green(pathToGagarin));

    require(pathToGagarin).cli().catch(function (err) {
      console.log(chalk.red(err.stack));
    });

  });
};
