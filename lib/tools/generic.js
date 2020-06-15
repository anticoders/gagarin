var genericPromiseChain = require('./genericPromiseChain');
var Promise = require('es6-promise').Promise;

module.exports = function generic(methods, myPrototype, defaultAction) {

  var GenericPromiseChain = genericPromiseChain(methods, myPrototype, defaultAction);

  function Generic (operand) {
    this._operand = operand;
  }

  Generic.prototype = Object.create(myPrototype, {
    methods: { value: GenericPromiseChain.prototype.methods }
  });

  GenericPromiseChain.prototype.methods.forEach(function (name) {
    Generic.prototype[name] = function () {
      var chain = new GenericPromiseChain(this._operand);
      return chain[name].apply(chain, arguments);
    };

  });

  return Generic;

}

