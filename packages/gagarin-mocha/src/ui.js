import Mocha from 'Mocha';

Mocha.interfaces['gagarin'] = gagarin;

/**
 * Custom Mocha interface.
 */
export default function gagarin (suite) {

  // build on top of the standard bdd interface
  Mocha.interfaces.bdd.apply(this, arguments);

  suite.on('pre-require', function (context) {

    var before = context.before;
    var after  = context.after;

    context.meteor = function (options, onStart) {

    };

    context.browser = function (location, options, initialize) {

    };

    context.ddp = function (options) {

    };

    context.mongo = function (options) {

    };

  });
}
