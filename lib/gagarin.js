var Promise = require('es6-promise').Promise;
var Meteor  = require('./meteor');
var Mocha   = require('mocha');
var chalk   = require('chalk');
var path    = require('path');
var util    = require('util');
var wd      = require('wd');

var BuildAsPromise = Meteor.BuildAsPromise;

module.exports = Gagarin;

function Gagarin (gagarinOptions) {

  // TODO: also integrate with other UI's
  gagarinOptions.ui = 'bdd';

  Mocha.call(this, gagarinOptions);

  this.suite.on('pre-require', function (context) {

    var before = context.before;
    var after  = context.after;

    context.meteor = function (options, initialize) {

      var meteor = new Meteor({
        pathToApp: gagarinOptions.pathToApp || options.pathToApp,
      });
      
      if (typeof options === 'function') {
        initialize = options; options = {};
      }

      before(function () {
        return meteor.start();
      });

      after(function () {
        return meteor.exit();
      });

      return meteor;
    }

    context.browser = function (options, initialize) {

      if (typeof options === 'string') {
        options = { location: options };
      }

      var browser  = wd.promiseChainRemote(gagarinOptions.webdriver || "http://localhost:9515");
      var location = options.location;

      before(function () {
        return browser.init().get(options.location);
      });

      after(function () {
        return browser.close().quit();
      });

      return browser;
    }

  });
}

util.inherits(Gagarin, Mocha);

Gagarin.prototype.run = function (callback) {

  var pathToApp = this.options.pathToApp || path.resolve('.');
  var self      = this;

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

    clearInterval(handle);
    process.stdout.write(chalk.green('  --- ') + chalk.gray(title) + chalk.green(' ---\r'));

    Mocha.prototype.run.call(self, callback);

  }, function (err) {
     clearInterval(handle);
     console.error(err.toString());
     process.exit(1);
  });

};


