#!/usr/bin/env node

var Gagarin = require('./lib/gagarin');
var path = require('path');
var fs = require('fs');
var pathToApp = path.resolve('./tests/example');

var gagarin = new Gagarin({
  pathToApp : pathToApp,
  reporter  : 'spec',
  timeout   : 20000,
});

fs.readdirSync(path.join(__dirname, 'tests', 'specs')).forEach(function (file) {
  gagarin.addFile(path.join(__dirname, 'tests', 'specs', file));
});

gagarin.run(function (failedCount) {
  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
});
