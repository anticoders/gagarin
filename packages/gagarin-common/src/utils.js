
export function either (first) {
  return {
    or: function (second) {
      return function (arg1, arg2) {
        return arg1 ? first(arg1) : second(arg2);
      };
    }
  };
};

export function memoize (func) {
  let cache = {};
  return function (string) {
    if (!cache[string]) {
      cache[string] = func.apply(this, arguments);
    }
    return cache[string];
  };
};

export function firstArgNull (callback) {
  return function (value) {
    callback(null, value);
  }
};

export function exitAsPromise (otherProcess) {
  return new Promise(function (resolve, reject) {
    otherProcess.once('error', reject);
    otherProcess.once('exit', resolve);
    otherProcess.kill();
  });
};

export function stack () {
  let orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  let err = new Error;
  Error.captureStackTrace(err, arguments.callee);
  let stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};

export function mergeHelpers (helpers, moreHelpers) {

  helpers = helpers || {};

  if (moreHelpers) {
    if (!Array.isArray(moreHelpers)) {
      moreHelpers = [ moreHelpers ];
    }
    moreHelpers.forEach(function (helpersToAdd) {
      if (!helpersToAdd || !typeof helpersToAdd === 'object') {
        return;
      }
      Object.keys(helpersToAdd).forEach(function (key) {
        if (helpers[key] !== undefined) {
          console.warn('helper ' + key + ' conflicts with some other method');
        }
        helpers[key] = helpersToAdd[key];
      });
    });
  }
  return helpers;
};
