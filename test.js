#!/usr/bin/env node

var Gagarin = require('./lib/mocha/gagarin');
var path = require('path');
var fs = require('fs');
var pathToApp = path.resolve('./tests/example');
var program = require('commander');

program
  .option('-g, --grep <pattern>', 'only run tests matching <pattern>')
  .option('-w, --webdriver <url>', 'webdriver url [default: http://127.0.0.1:9515]', 'http://127.0.0.1:9515')
  .option('-B, --skip-build', 'do not build, just run the tests')
  .option('-o, --build-only', 'just build, do not run the tests')
  .option('-V, --verbose', 'run with verbose mode with logs from client/server', false)

program.parse(process.argv);

var gagarin = new Gagarin({
  pathToApp     : pathToApp,
  webdriver     : program.webdriver,
  reporter      : 'spec',
  timeout       : 6000,
  grep          : program.grep,
  skipBuild     : program.skipBuild,
  buildOnly     : program.buildOnly,
  muteBuild     : !program.verbose,
  //verbose       : program.verbose,
  verbose       : true,
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
