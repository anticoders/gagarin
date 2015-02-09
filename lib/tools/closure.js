
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
  accessor   = accessor || function () {};
  
  parent && parent.__mixin__ && parent.__mixin__(closure);

  listOfKeys.forEach(function (key) {
    closure[key] = accessor.bind(null, key);
  });

  this.getValues = function () {
    var values = {};
    Object.keys(closure).forEach(function (key) {
      values[key] = closure[key]();
      if (values[key] === undefined) {
        values[key] = null;
      }
      if (typeof values[key] === 'function') {
        throw new Error('a closure variable must be serializable, so you cannot use a function');
      }
    });
    return values;
  }

  this.setValues = function (values) {
    Object.keys(values).forEach(function (key) {
      closure[key](values[key]);
    });
  }

  this.__mixin__ = function (object) {
    Object.keys(closure).forEach(function (key) {
      object[key] = closure[key];
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
      throw new Error('closure must be either a function or an object');
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
