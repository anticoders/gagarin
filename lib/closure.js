
module.exports = Closure;

function Closure (parent, listOfKeys, accessor) {

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
