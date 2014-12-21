var Promise = require('es6-promise').Promise;
var either  = require('./tools').either;

module.exports = MeteorPromiseChain;

//---------------------
// METEOR PROMISE CHAIN
//---------------------

function MeteorPromiseChain (operand, helpers) {
  "use strict";

  var self = this;

  helpers = helpers || {};

  this._operand = operand;
  this._promise = operand;
  this._helpers = helpers;

  // TODO: check for conflicts
  // install helpers
  Object.keys(helpers).forEach(function (key) {
    self[key] = helpers[key];
  });
}

[ 'then', 'catch' ].forEach(function (name) {

  MeteorPromiseChain.prototype[name] = function () {
    "use strict";

    this._promise = this._promise[name].apply(this._promise, arguments);
    return this;
  };

});

MeteorPromiseChain.methods = [
  'execute',
  'promise',
  'wait',
  'stop',
  'start',
  'restart',
];

MeteorPromiseChain.prototype.always = function (callback) {
  "use strict";

  return this.then(callback, callback);
};

MeteorPromiseChain.prototype.sleep = function (timeout) {
  "use strict";

  var self = this;
  return self.then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, timeout);
    });
  });
};

MeteorPromiseChain.prototype.expectError = function (callback) {
  "use strict";

  var self = this;
  return self.then(function () {
    throw new Error('exception was not thrown');
  }, callback);
};

MeteorPromiseChain.prototype.noWait = function () {
  return MeteorPromiseChain(this._operand, this._helpers);
};

MeteorPromiseChain.prototype.yet = function (code, args) {
  "use strict";

  var args = Array.prototype.slice.call(arguments, 0);
  var self = this;
  //--------------------------------
  return self.catch(function (err) {
    return self.noWait().execute(code, args).then(function (errMessage) {
      throw new Error(err.message + ' ' + errMessage);
    });
  });
};

MeteorPromiseChain.prototype.timeout = function () {
  console.warn('timeout for server code is not implemented yet');
  return this;
}

MeteorPromiseChain.methods.forEach(function (name) {
  "use strict";

  /**
   * Update the current promise and return this to allow chaining.
   */
  MeteorPromiseChain.prototype[name] = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    self._promise = Promise.all([
      self._operand, self._promise
    ]).then(function (all) {
      return new Promise(function (resolve, reject) {
        var operand = all[0];
        if (!operand || typeof operand !== 'object') {
          reject(new Error('MeteorPromiseChain: invalid operand'));
        } else if (!operand[name]) {
          reject(new Error('MeteorPromiseChain: operand does not implement method: ' + name));
        } else {
          args.push(either(reject).or(resolve));
          return operand[name].apply(operand, args);
        }
      });
    });
    return self;
  };

});
