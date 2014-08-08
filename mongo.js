var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var mkdirp = require('mkdirp');
var spawn = require('child_process').spawn;
var path = require('path');
var either = require('./tools').either;
var debounce = require('debounce');

module.exports = {

  Server: function (options) {
    var port = 27018 + Math.floor(Math.random() * 1000);
    return new Promise(function (resolve, reject) {
      var configure = options.dbPath ? new Promise(function (resolve, reject) {
        mkdirp(options.dbPath, either(reject).or(resolve));
      }) : Promise.resolve('');
      //--------------------------
      configure.then(function () {
        var mongod;
        var args = [ '--port', port, '--smallfiles', '--nojournal', '--noprealloc' ];
        options.dbPath && args.push('--dbpath', path.resolve(options.dbPath));
        mongod = spawn(options.mongoPath || 'mongod', args);
        // use debounce to give the process some time in case it exits prematurely
        mongod.stdout.on('data', debounce(function (data) {
          resolve(new MongoHandle(mongod, port));
        }, 100));
        // on premature exit, reject the promise
        mongod.on('exit', function (code) {
          code && reject(new Error("mongo eixted with code: " + code));
        });
        // make sure mongod is killed as well if the parent process exits
        process.on('exit', function () {
          mongod.kill();
        });
      }, reject);
    });
  },

  connect: function (mongod, db_name) {
    return mongod.then(function (handle) {
      var mongoUrl = 'mongodb://127.0.0.1:' + handle.port + '/' + db_name;
      return new Promise(function (resolve, reject) {
        MongoClient.connect(mongoUrl, either(reject).or(function (db) {
          resolve(new DatabaseHandle(db, mongoUrl));
        }));
      });
    });
  },

};

function MongoHandle(mongod, port) {
  this.port = port;
  this.kill = function () {
    return tools.exitAsPromise(mongod);
  };
}

function DatabaseHandle(db, mongoUrl) {
  this.mongoUrl = mongoUrl;
  this.drop = function () {
    return new Promise(function (resolve, reject) {
      db.dropDatabase(either(reject).or(resolve));
    });
  }
}
