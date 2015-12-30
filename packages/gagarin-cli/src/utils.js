
export function asPromise (func) {
  return function promise (...args) {
    return new Promise(function (resolve, reject) {
      func(...args, either(reject, resolve));
    });
  }
};

export function either (first, second) {
  return function (arg1, arg2) {
    return arg1 ? first(arg1) : second(arg2);
  };
};
