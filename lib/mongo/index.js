var MongoDatabase = require('./database');
var Promise       = require('es6-promise').Promise;
var generic       = require('../tools/generic');
var either        = require('../tools').either;

module.exports = function makeMongoDB (options, helpers) {

  // TODO: check if arguments are ok

  var methods = [];

  helpers = helpers || {};

  var myPrototype = Object.create(helpers);

  function makeCursorMethod (name, method) {
    return function () {
      var args = Array.prototype.slice.call(arguments, 0);
      var self = this;
      if (!this.__cursor__) {
        throw new Error('method "' + name + '" may only be applied to cursor');
      }
      return method.call(this, args, function () { return self.__cursor__ });
    }
  }

  function makeCollectionMethod (name, method) {
    return function () {
      var args = Array.prototype.slice.call(arguments, 0);
      if (!this.__collection__) {
        throw new Error('method "' + name + '" may only be applied to collection');
      }
      return method.call(this, args, this.__collection__);
    }
  }

  // --- database methods ---

  myPrototype.start = function () {
    return this.then(function () {});
  }

  myPrototype.stop = function () {
    return this.__custom__(function (operand, cb) {
      operand.dropDatabase(cb);
    });
  }

  myPrototype.collection = function (name) {
    var branch = this.branch();
    branch.__collection__ = name;
    return branch;
  };

  myPrototype.find = makeCollectionMethod('find', function (args, name) {
    var branch = this.branch();

    branch.__collection__ = name;
    branch.__cursor__ = true;

    return branch.__custom__(function (operand, cb) {
      var collection = operand.collection(branch.__collection__);
      branch.__cursor__ = collection.find.apply(collection, args);
      cb();
    });
  });

  // --- collection methods ---

  [ 'insert', 'update', 'remove', 'findOne' ].forEach(function (method) {

    myPrototype[method] = makeCollectionMethod(method, function (args, name) {
      if (method === 'insert' || method === 'remove') {
        setOptions(args, 1, { w: 1 });
      }
      if (method === 'update') {
        setOptions(args, 2, { w: 1 });
      }
      return this.__custom__(function (operand, cb) {
        var collection = operand.collection(name);
        args.push(cb);
        collection[method].apply(collection, args);
      });
    });

  });

  // --- cursor methods ---

  [ 'sort', 'limit', 'skip', 'rewind' ].forEach(function (method) {

    myPrototype[method] = makeCursorMethod(method, function (args) {
      this.__cursor__ = this.__cursor__[method].apply(this.__cursor__, args);
      return this;
    });

  });

  [ 'nextObject', 'toArray' ].forEach(function (method) {

    myPrototype[method] = makeCursorMethod(method, function (args, cursor) {
      return this.then(function () {
        return new Promise(function (resolve, reject) {
          args.push(either(reject).or(resolve));
          //-------------------------------------
          cursor()[method].apply(cursor(), args);
        });
      });
    });

  });

  myPrototype.each = makeCursorMethod('each', function (args, cursor) {
    if (typeof args[0] !== 'function') {
      throw new Error('the argument for "each" should be an iterator function');
    }
    return this.then(function () {
      return new Promise(function (resolve, reject) {
        (function next() {
          cursor().next(function (err, data) {
            if (err) {
              reject(err);
            } else if (!data) {
              resolve();
            } else {
              args[0](data);
              next();
            }
          });
        }());
      });
    });
  });

  //-----------------------------------------------

  var MongoGeneric = generic(methods, myPrototype);

  var MongoDB = function () {
    MongoGeneric.call(this, new MongoDatabase(options));
  };

  MongoDB.prototype = Object.create(new MongoGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), MongoGeneric.prototype.methods) }
  });

  return new MongoDB();
}

function setOptions(args, index, options) {
  while (args.length <= index) {
    args.push({});
  }
  Object.keys(options).forEach(function (key) {
    args[index][key] = options[key];
  });
}
