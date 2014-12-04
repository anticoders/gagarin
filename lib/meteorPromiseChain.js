var Promise = require('es6-promise').Promise;

module.exports = MeteorPromiseChain;

//---------------------
// METEOR PROMISE CHAIN
//---------------------

function MeteorPromiseChain (operand) {
  this._operand = operand;
  this._promise = operand;
}

[ 'then', 'catch' ].forEach(function (name) {

  MeteorPromiseChain.prototype[name] = function () {
    this._promise = this._promise[name].apply(this._promise, arguments);
    return this;
  };

});

MeteorPromiseChain.methods = [
  'execute',
  'promise',
  'wait',
  'exit',
  'start',
  'restart',
];

MeteorPromiseChain.prototype.always = function (callback) {
  return this.then(callback, callback);
};

MeteorPromiseChain.prototype.sleep = function (timeout) {
  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

MeteorPromiseChain.prototype.expectError = function (callback) {
  var self = this;
  return self.then(function () {
    throw new Error('exception was not thrown');
  }, callback);
};

MeteorPromiseChain.methods.forEach(function (name) {

  /**
   * Update the current promise and return this to allow chaining.
   */
  MeteorPromiseChain.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    self._promise = Promise.all([
      self._operand, self._promise
    ]).then(function (all) {
      // use the promise returned by operand
      return all[0][name].apply({}, args);
    });
    return self;
  };

});
