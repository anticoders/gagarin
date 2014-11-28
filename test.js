#!/usr/bin/env node

var Mocha = require('mocha');
var path = require('path');
var fs = require('fs');
var BuildAsPromise = require('./lib/gagarin').BuildAsPromise;
var colors = require('colors');
var pathToApp = path.resolve('./tests/example');

var mocha = new Mocha({
  reporter : 'spec',
  timeout  : 20000,
});

fs.readdirSync(path.join(__dirname, 'tests', 'specs')).forEach(function (file) {
  mocha.addFile(path.join(__dirname, 'tests', 'specs', file));
});

process.stdout.write('\n');

var counter = 0;
var spinner = '/-\\|';
var handle = setInterval(function () {
  var animated = spinner.charAt(counter++ % spinner.length).yellow;
  process.stdout.write('  -'.yellow + animated  + '- '.yellow + pathToApp + ' -'.yellow + animated  + '-\r'.yellow);
}, 100);

BuildAsPromise(pathToApp).then(function () {

  clearInterval(handle);
  process.stdout.write('  --- '.green + pathToApp.grey + ' ---\r'.green);

  mocha.run(function (failedCount) {
    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  });

}, function (err) {
   clearInterval(handle);
   console.error(err.toString());
   process.exit(1);
});
