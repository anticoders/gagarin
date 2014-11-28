var Promise = require('es6-promise').Promise;

module.exports = MeteorAsPromise;

function MeteorAsPromise (options, operand, promise) {
  this._operand = operand;
  this._promise = promise || operand;
  this._options = options;
}

MeteorAsPromise.prototype.sleep = function (timeout) {
  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

MeteorAsPromise.prototype.expectError = function (callback) {
  var self = this;
  return self.then(function () {
    throw new Error('exception was not thrown');
  }, callback);
};

// proxies for promise methods

[ 'then', 'catch' ].forEach(function (name) {
  MeteorAsPromise.prototype[name] = function () {
    return new MeteorAsPromise(this._options, this._operand, this._promise[name].apply(this._promise, arguments));
  }
});

// proxies for transponder methods

[ 'execute', 'promise', 'wait', 'exit', 'start', 'restart' ].forEach(function (name) {
  MeteorAsPromise.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    return new MeteorAsPromise(self._options, self._operand, Promise.all([ self._operand, self._promise ]).then(function (all) {
      return all[0][name].apply(all[0], args);
    }));
  };
});
