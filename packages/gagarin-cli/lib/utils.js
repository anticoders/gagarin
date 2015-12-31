'use strict';

/**
 * Turn promise generator into a function returning a thunk.
 *
 * @api private
 * @param {Function} func
 * @return {Function}
 */
exports.promiseAsThunk = function (func) {
  return function (cb) {
    func().then(function (res) {
      cb(null, res);
    }, cb);
  };
};

/**
 * Execute asynchronous function until one of them returns positive result.
 * Only "throw" if none of them succeeds.
 *
 * @api private
 * @param {Function[]} array
 * @param {Function} cb
 */
exports.stopOnFirstSuccess = function (array, cb) {
  (function next (i) {
    if (i >= array.length) {
      return cb(new Error('All failed.'));
    }
    array[i](function (err, res) {
      if (err || !res) {
        next(i+1);
      } else {
        cb(null, res);
      }
    });
  }(0));
};
