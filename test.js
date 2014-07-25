#!/usr/bin/env node

var Mocha = require('mocha');
var path = require('path');
var fs = require('fs');
//var gagarin = require('./gagarin');

//gagarin.config({
//  mongoPath: '~/.meteor/tools/latest/mongodb/bin/mongod'
//});

var mocha = new Mocha({
  reporter : 'spec',
  timeout  : 20000,
});

fs.readdirSync(path.join(__dirname, 'tests', 'specs')).forEach(function (file) {
  mocha.addFile(path.join(__dirname, 'tests', 'specs', file));
});

mocha.run(function (failedCount) {
  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
});
