/*jshint esnext: true*/

import {Command} from 'commander';
import {logs, asPromise, checkPathIsDirectory} from 'gagarin-common';
import {resolve as pathResolve} from 'path';
import resolve from 'resolve';
import chalk from 'chalk';
import version from '../../package.json';
import * as commands from './commands';

export async function cli (basedir) {

  var basedir = process.cwd();
  var program = new Command();

  program.name = 'gagarin';
  program
    .version(version)
    .usage('[options] [pattern]')
    .option('-c, --config <path>', 'provide path to config file')
    .option('-v, --verbose', 'run with verbose mode with logs from client/server', false)

  program
    .command('setup')
    .description('initialize Gagarin configuration file')
    .action(function(options) {
      commands.setup(options).then(onReady, onError);
    });

  program
    .command('run <pattern>')
    .description('prepare environment and run testing framework(s)')
    .option('-f, --framework <type>', 'select testing framework to run')
    .option('-o, --options <values>', 'allow overwriting selected framework options')
    .option('-r, --force-rebuild', 'ensure applications are rebuild', false)
    .option('-C, --no-cleanup', 'do not run cleanup after tests are done', false)
    .action(function(pattern, options) {
      commands.run(options).then(onReady, onError);;
    });

  program
    .command('cleanup [name]')
    .description('cleanup testing environment')
    .action(function(options) {
      commands.cleanup(options).then(onReady, onError);;
    });

  program
    .command('status [name]')
    .description('show status')
    .action(function(options) {
      commands.status(options).then(onReady, onError);;
    });

  program
    .command('logs [name]')
    .description('show logs')
    .action(function(options) {
      commands.logs(options).then(onReady, onError);;
    });

  program.basedir = basedir;
  program.parse(process.argv);

  function onReady () {
    console.log('ready');
  }

  function onError (err) {
    console.log(err.stack);
  }
};

