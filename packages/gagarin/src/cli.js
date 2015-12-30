import {Command} from 'commander';
import {logs, asPromise, checkPathIsDirectory} from 'gagarin-common';
import {resolve as pathResolve} from 'path';
import resolve from 'resolve';
import chalk from 'chalk';
import glob from 'glob';
import version from '../package.json';

function parse10(v) {
  return parseInt(v, 10);
}

export async function cli () {

  var program = new Command();

  program
    .version(version)
    .usage('[options] [file-pattern]')
    .option('-g, --grep <pattern>', 'only run tests matching <pattern>')
    .option('-s, --settings <path>', 'use meteor settings from the given file')
    .option('-t, --timeout <ms>', 'set test-case timeout in milliseconds [5000]', 5000)
    .option('-B, --skip-build', 'do not build, just run the tests')
    .option('-v, --verbose', 'run with verbose mode with logs from client/server', false)
    .option('-w, --webdriver <url>', 'webdriver url [default: http://127.0.0.1:9515]', 'http://127.0.0.1:9515')
    .option('-a, --path-to-app <path>', 'path to a meteor application', pathResolve('.'))
    .option('-f, --flavor <name>', 'default flavor of api (promise, fiber)', 'promise')

  program.name = 'gagarin';
  program.parse(process.argv);

  let pattern = program.args[0];
  let appPath = '';

  // set verbose mode if necessary
  logs.setVerbose(program.verbose);

  // absolute path is always a little more safe ...
  program.pathToApp = pathResolve(program.pathToApp);

  // fallback to default test dir if there is no pattern provided
  if (!pattern) {
    appPath = program.pathToApp.replace(/\\/g, '/');
    pattern = [appPath, 'tests', 'gagarin', '**/*.{js,coffee}'].join('/');
  }

  // create a pattern if a directory was provided, a file path already is a valid pattern
  if (await checkPathIsDirectory(pattern)) {
    pattern = pattern.replace(/\/$/, '') + '/**/*.{js,coffee}';
  }

  logs.system('searching for test files, using glob pattern `' + pattern + '`');
  
  let files = glob.sync(pattern, {
    // resolve absolute path instead of relative, just to be safe
    realpath: true
  });

  if (files.length === 0) {
    console.log(chalk.red(`could not find any test files matching pattern '${pattern}'`));
    process.exit(1);
  }

  files.forEach(function (file) {
    if (program.verbose) {
      process.stdout.write(chalk.green('  --- ') + chalk.gray('added => ' + file) + '\n');
    }
    // gagarin.addFile(file);
  });

  process.stdout.write(
    chalk.green(`\n  added ${files.length} test file` + (files.length > 1 ? 's' : '') + ` ...\n\n`));

  // gagarin.run(function (failedCount) {
  //   process.once('clean', function () {
  //     process.exit(failedCount > 0 ? 1 : 0);
  //   });
  // });

};

