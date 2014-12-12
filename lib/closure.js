
module.exports = Closure;

/**
 * Creates a new closure manager.
 *
 * @param {Object} parent
 * @param {Array} listOfKeys (names)
 * @param {Function} accessor
 */
function Closure (parent, listOfKeys, accessor) {
  "use strict";

  var closure = {};

  listOfKeys = listOfKeys || [];
  accessor = accessor || function () {};
  parent  = parent || {};

  Object.keys(parent).forEach(function (key) {
    closure[key] = parent[key];
  });

  listOfKeys.forEach(function (key) {
    closure[key] = accessor.bind(null, key);
  });

  this.getValues = function () {
    var values = {};
    Object.keys(closure).forEach(function (key) {
      values[key] = closure[key]();
    });
    return values;
  }

  this.setValues = function (values) {
    Object.keys(values).forEach(function (key) {
      closure[key](values[key]);
    });
  }

}

/**
 * Adds closure updater functionality to the given object.
 *
 * @param {Object} object
 */
Closure.mixin = function (object) {
  "use strict";

  var accessor = function () { return arguments.length === 0 ? {} : undefined };

  object.closure = function () { // we need this proxy, because accessor may change dynamically
    return accessor.apply(null, arguments);
  }

  object.useClosure = function (objectOrGetter) {
    if (typeof objectOrGetter !== 'function' && typeof objectOrGetter !== 'object') {
      throw new Error('closure must be either function or object');
    }
    accessor = function (values) {
      var closure = (typeof objectOrGetter === 'function') ? objectOrGetter() : objectOrGetter;
      if (arguments.length === 0) {
        return closure ? closure.getValues() : {};
      }
      closure && closure.setValues(values);
    }
  };

}
