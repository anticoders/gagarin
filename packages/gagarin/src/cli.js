
import {Command} from 'commander';
import {logs, asPromise, checkPathIsDirectory} from 'gagarin-common';
import {resolve as pathResolve} from 'path';
import resolve from 'resolve';
import chalk from 'chalk';
import version from '../package.json';
import {launchGagarinProcesses} from 'gagarin-launch-control';
import * as commands from './commands';

function parse10(v) {
  return parseInt(v, 10);
}

export async function cli () {

  var basedir = process.cwd();
  var program = new Command();

  program.name = 'gagarin';
  program
    .version(version)
    .usage('[options] [file-pattern]')
    .option('-d, --directory <path>', 'path to gagarin base directory')
    .option('-v, --verbose', 'run with verbose mode with logs from client/server', false)
    .option('-w, --webdriver <url>', 'webdriver url [default: http://127.0.0.1:9515]', 'http://127.0.0.1:9515')

  program
    .command('init')
    .description('initialize gagarin configuration file')
    .action(function(options) {
      if (!options.directory) {
        options.directory = basedir;
      }
      commands.init(options).then(onReady, onError);
    });

  program
    .command('launch')
    .description('launch gagarin testing environment')
    .option("-b, --rebuild [app]", "force meteor project rebuild")
    .action(function(options) {
      if (!options.directory) {
        options.directory = basedir;
      }
      commands.launch(options).then(onReady, onError);;
    });

  program
    .command('restart <name>')
    .description('restart the process given by name')
    .action(function(options) {
      if (!options.directory) {
        options.directory = basedir;
      }
      commands.restart(options).then(onReady, onError);;
    });

  // program
  //   .command('test [pattern]')
  //   .option('-g, --grep <pattern>', 'only run tests matching <pattern>')
  //   .description('run tests using gagarin own test runner')
  //   .action(function(options) {
  //     if (!options.directory) {
  //       options.directory = basedir;
  //     }
  //     commands.test(options).then(onReady, onError);;
  //   });

  program.parse(process.argv);

  function onReady () {
    console.log('ready');
  }

  function onError (err) {
    console.log(err.stack);
  }
};

