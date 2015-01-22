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
    var branch = this.noWait();
    branch.__collection__ = name;
    return branch;
  };

  [ 'insert', 'update', 'remove', 'findOne' ].forEach(function (method) {

    myPrototype[method] = function () {
      
      var args = Array.prototype.slice.call(arguments, 0);
      var name = this.__collection__;

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
