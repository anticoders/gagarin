import Mocha from 'Mocha';

Mocha.interfaces['gagarin'] = gagarin;

/**
 * Custom Mocha interface.
 */
export default function gagarin (suite) {

  // build on top of the standard bdd interface
  Mocha.interfaces.bdd.apply(this, arguments);

  suite.beforeAll(function () {

  });

  suite.afterAll(function () {

  });

  suite.on('pre-require', function (context, file, mocha) {

    let before = context.before;
    let after  = context.after;

    context.meteor = function (options) {
      
    };

    context.browser = function (options) {
      
    };

    context.ddp = function (options) {
      
    };

    context.mongo = function (options) {
      
    };

    context.gagarin = {
      launch () {
        setTimeout(function () {
          suite.run(function (...args) {
            console.log('SUITE READY', args);
          });
        }, 2000);
      }
    };

  });
}
