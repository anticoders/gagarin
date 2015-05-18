var genericPromiseChain = require('./genericPromiseChain');
var Promise = require('es6-promise').Promise;
var either  = require('./index').either;

module.exports = function generic(methods, myPrototype, defaultAction) {

  var GenericPromiseChain = genericPromiseChain(methods, myPrototype, defaultAction);

  function Generic (operand) {
    "use strict";

    var that = this;

    this._promise = new Promise(function (resolve, reject) {

      var notYetResolved = true;

      that._operand = function () {

        var promise = typeof operand === 'function' ? operand() : operand;

        if (typeof promise.then !== 'function') {
          promise = Promise.reject(new Error('operand must be a promise'));
        }

        if (notYetResolved) {
          promise.then(resolve, reject);
          notYetResolved = false;
        }

        return promise;
      }

    });
  }

  Generic.prototype = Object.create(myPrototype, {
    methods: { value: GenericPromiseChain.prototype.methods }
  });

  Generic.prototype.ready = function ready () {
    return this._promise;
  }

  GenericPromiseChain.prototype.methods.forEach(function (name) {
    "use strict";

    Generic.prototype[name] = function () {
      var chain = new GenericPromiseChain(this._operand);
      return chain[name].apply(chain, arguments);
    };

  });

  return Generic;

}
