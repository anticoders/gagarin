
/**
 * Module dependencies.
 */

var Meteor = require('./meteor');
var tools  = require('./tools');
var Mocha  = require('mocha');
var chalk  = require('chalk');
var path   = require('path');
var util   = require('util');
var fs     = require('fs');
var BuildAsPromise = Meteor.BuildAsPromise;

module.exports = Gagarin;

/**
 * Creates Gagarin with `options`.
 *
 * It inherits everything from Mocha except that the ui
 * is always set to "gagarin".
 *
 * @param {Object} options
 */
function Gagarin (options) {
  "use strict";

  // XXX gagarin user interface is defined here
  require('./interface');

  options.ui = 'gagarin';

  // TODO: filter out our custom options
  Mocha.call(this, options);

  this.settings = tools.getSettings(options.settings);
}

util.inherits(Gagarin, Mocha);

/**
 * A not-so-thin wrapper around Mocha.run; first build the
 * meteor app, then run the tests.
 *
 * @param {Function} callback
 */


Gagarin.prototype.run = function (callback) {
  "use strict";

  var pathToApp = this.options.pathToApp || path.resolve('.');
  var self      = this;

  var checkVersionsComplatibility = function(callback){
    fs.readFile(pathToApp+'/.meteor/versions','utf-8', function read(err, data) {
      var meteorPackageVersion = data.match(/anti:gagarin@(.*)/)[1];
      if(self.options._version != meteorPackageVersion){
        process.stdout.write(
          chalk.red('Versions of node and meteor gagarin packages are not compatible please update \n')
        );
        process.kill();
      }else{
        callback();
      }
    });
  };

  var run = function(){
    process.stdout.write('\n');

    var title = 'building app => ' + pathToApp;

    var counter = 0;
    var spinner = '/-\\|';
    var handle = setInterval(function () {
      var animated = chalk.yellow(spinner.charAt(counter++ % spinner.length));
      process.stdout.write(
        chalk.yellow('  -') + animated  + chalk.yellow('- ') + title + chalk.yellow(' -') + animated  + chalk.yellow('-\r')
      );
    }, 100);

    BuildAsPromise(pathToApp).then(function () {


      //throw new Error('test');
      clearInterval(handle);
      process.stdout.write(chalk.green('  --- ') + chalk.gray(title) + chalk.green(' ---\r'));

      Mocha.prototype.run.call(self, callback);

    }, function (err) {
      // clear the loading spinner
      process.stdout.write(new Array(title.length + 12).join(' '));
      clearInterval(handle);
      throw err;
    })
    .catch(function (err) {
      // make sure the error passes through promise
      setTimeout(function () {
        throw err;
      });
    });
  }


  checkVersionsComplatibility(run);

};
