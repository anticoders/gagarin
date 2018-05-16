#!/usr/bin/env node

var Gagarin = require('./lib/mocha/gagarin');
var path = require('path');
var fs = require('fs');
// import * as fs from "fs";
var logs = require('./lib/logs');
var pathToApp = path.resolve('./tests/example');
var program = require('commander');


var Promise = require('es6-promise').Promise;
var expect = require('chai').expect;
var path = require('path');


program
  .option('-g, --grep <pattern>', 'only run tests matching <pattern>')
  .option('-w, --webdriver <url>', 'webdriver url [default: http://127.0.0.1:9515]', 'http://127.0.0.1:9515')
  .option('-B, --skip-build', 'do not build, just run the tests')
  .option('-o, --build-only', 'just build, do not run the tests')
  .option('-v, --verbose', 'run with verbose mode with logs from client/server', false)
  .option('-p, --parallel <number>', 'run test suites in parallel', parseInt, 0)
  .option('-m, --mute-build', 'do not show build logs', false)
  .option('-c, --coverage', 'run client coverage (chrome only)', false)

program.parse(process.argv);

// set verbose mode ...
logs.setVerbose(program.verbose);
logs.setSilentBuild(program.muteBuild);

var gagarin = new Gagarin({
  pathToApp     : pathToApp,
  webdriver     : program.webdriver,
  reporter      : 'spec',
  timeout       : 10000,
  muteBuild     : program.muteBuild,
  grep          : program.grep,
  skipBuild     : program.skipBuild,
  buildOnly     : program.buildOnly,
  parallel      : program.parallel,
  coverage      : program.coverage,

  startupTimeout    : 5000,
  meteorLoadTimeout : 4000,
  verbose           : program.verbose,
});

fs.readdirSync(path.join(__dirname, 'tests', 'specs')).forEach(function (file) {
  var fileType = path.extname(file);
  if (fileType === '.js') {
    gagarin.addFile(path.join(__dirname, 'tests', 'specs', file));
  }
});

gagarin.run(function (failedCount) {
  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
});
