var _ = require('lodash');

exports.retry = function (nTimes, f) {
  'use strict';

  return function wrapped (cb) {
    var nTries = 0;
    var that   = this;
    var args   = _.toArray(arguments);
    var cb     = _.last(args);
    //--------------------------------
    if (typeof cb === 'function') {
      args[args.length-1] = function (err) {
        if (err) {
          if (nTries < nTimes) {
            retry();
            nTries += 1;
          } else {
            cb(err);
          }
        } else {
          cb.apply(this, arguments);
        }
      };
    }

    // NOTE: it's bound to the current "this" ...
    function retry () {
      f.apply(that, args);
    }

    retry();
  };
};

exports.timeout = function (waitMs, f) {
  'use strict';

  return function wrapped (cb) {
    var timeout = null;
    var args    = _.toArray(arguments);
    var cb      = _.last(args);
    //-----------------------------
    if (typeof cb === 'function') {
      cb = _.once(cb);
      //---------------------------------
      args[args.length-1] = function () {
        clearTimeout(timeout);
        return cb.apply(this, arguments);
      };
    }

    timeout = setTimeout(function () {
      var err = new Error('Timeout after ' + waitMs + 'ms.');
      err.code = 'TIMEOUT';
      cb(err);
    }, waitMs);

    f.apply(this, args);
  };
};
