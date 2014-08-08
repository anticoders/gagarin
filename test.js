#!/usr/bin/env node

var Mocha = require('mocha');
var path = require('path');
var fs = require('fs');
var buildAsPromise = require('./build');
var colors = require('colors');
var pathToApp = path.resolve('./tests/example');

var mocha = new Mocha({
  reporter : 'spec',
  timeout  : 20000,
});

fs.readdirSync(path.join(__dirname, 'tests', 'specs')).forEach(function (file) {
  mocha.addFile(path.join(__dirname, 'tests', 'specs', file));
});

process.stdout.write('\n  Building Your App [[['.blue + pathToApp.blue + ']]] /'.blue);
var counter = 0;
var handle = setInterval(function () {
  process.stdout.write('\b' + '/-\\|'.charAt(counter++ % 4).blue);
}, 100);

buildAsPromise(pathToApp).then(function () {

  clearInterval(handle);

  mocha.run(function (failedCount) {
    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  });

});
