var MongoServer = require('./mongo');
var MongoClient = require('mongodb').MongoClient;
var Promise     = require('es6-promise').Promise;
var generic     = require('./generic');
var either      = require('./tools').either;

module.exports = function makeMongoDB (options, helpers) {

  // TODO: check if arguments are ok

  var mongoUrlProvider = function () {
    return new MongoServer(options).then(function (mongoUrl) {
      return mongoUrl + '/' + options.dbName;
    });
  }

  var methods = [];
  var collectionName = "";

  helpers = helpers || {};

  myPrototype = Object.create(helpers);

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

  myPrototype.find = function () {
    var args   = Array.prototype.slice.call(arguments, 0);
    
    var branch = this.branch();

    if (!this.__collection__) {
      throw new Error('find may only be used for collections');
    }

    branch.__collection__ = this.__collection__;
    branch.__cursor__ = true;

    return branch.__custom__(function (operand, cb) {
      var collection = operand.collection(branch.__collection__);
      branch.__cursor__ = collection.find.apply(collection, args);
      cb();
    });
  };

  [ 'sort', 'limit', 'skip', 'rewind' ].forEach(function (method) {

    myPrototype[method] = function () {
      var args   = Array.prototype.slice.call(arguments, 0);
      var cursor = this.__cursor__;

      if (!cursor) {
        throw new Error('method ' + method + ' may only be applied to cursor');
      }

      this.__cursor__ = cursor[method].apply(cursor, args);

      return this;
    };

  });

  [ 'nextObject', 'toArray' ].forEach(function (method) {

    myPrototype[method] = function () {
      var args = Array.prototype.slice.call(arguments, 0);
      var self = this;
      
      if (!self.__cursor__) {
        throw new Error('method ' + method + ' may only be applied to cursor');
      }

      return self.then(function () {
        return new Promise(function (resolve, reject) {
          args.push(either(reject).or(resolve));
          //---------------------------------------------------
          self.__cursor__[method].apply(self.__cursor__, args);
        });
      });
    };

  });

  myPrototype.each = function (iterator) {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;

    if (!self.__cursor__) {
      throw new Error('method each may only be applied to cursor');
    }

    return self.then(function () {
      return new Promise(function (resolve, reject) {

        (function next() {
          self.__cursor__.nextObject(function (err, data) {
            if (err) {
              reject(err);
            } else if (!data) {
              resolve();
            } else {
              iterator(data);
              next();
            }
          });
        }());

      });
    });
  };

  // TODO: use "{w: 1}" option

  [ 'insert', 'update', 'remove', 'findOne' ].forEach(function (method) {

    myPrototype[method] = function () {
      
      var args = Array.prototype.slice.call(arguments, 0);
      var name = this.__collection__;

      if (method === 'insert' || method === 'remove') {
        setOptions(args, 1, { w: 1 });
      }

      if (method === 'update') {
        setOptions(args, 2, { w: 1 });
      }

      if (!name) {
        throw new Error('method ' + method + ' may only be used for collections');
      }

      return this.__custom__(function (operand, cb) {
        var collection = null;
        collection = operand.collection(name);
        args.push(cb);
        collection[method].apply(collection, args);
      });
    };

  });

  var MongoGeneric = generic(methods, myPrototype);

  var MongoDB = function () {
    MongoGeneric.call(this, mongoClientPromise(mongoUrlProvider));
  };

  MongoDB.prototype = Object.create(new MongoGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), MongoGeneric.prototype.methods) }
  });

  return new MongoDB();
}

function mongoClientPromise(mongoUrlProvider) {
  return mongoUrlProvider().then(function (mongoUrl) {
    return new Promise(function (resolve, reject) {
      MongoClient.connect(mongoUrl, either(reject).or(resolve));
    });
  });
}

function setOptions(args, index, options) {
  while (args.length <= index) {
    args.push({});
  }
  Object.keys(options).forEach(function (key) {
    args[index][key] = options[key];
  });
}
