var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var mkdirp = require('mkdirp');
var spawn = require('child_process').spawn;
var path = require('path');
var tools = require('./tools');
var either = tools.either;
var debounce = require('debounce');

module.exports = {

  MongoServerAsPromise: function (options) {
    var port = 27018 + Math.floor(Math.random() * 1000);
    
    var mongoPath = options.mongoPath || tools.getMongoPath(options.pathToApp);
    var dbPath = options.dbPath || tools.getPathToDB(options.pathToApp);

    return new Promise(function (resolve, reject) {
      var configure = dbPath ? new Promise(function (resolve, reject) {
        mkdirp(dbPath, either(reject).or(resolve));
      }) : Promise.resolve('');
      //--------------------------
      configure.then(function () {
        var mongod;
        var args = [ '--port', port, '--smallfiles', '--nojournal', '--noprealloc' ];
        dbPath && args.push('--dbpath', path.resolve(dbPath));
        mongod = spawn(mongoPath || 'mongod', args);
        mongod.port = port;
        // use debounce to give the process some time in case it exits prematurely
        mongod.stdout.on('data', debounce(function (data) {
          //process.stdout.write(data);
          resolve(mongod);
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

  connectToDB: function (mongod, dbName) {
    return mongod.then(function (handle) {
      var mongoUrl = 'mongodb://127.0.0.1:' + handle.port + '/' + dbName;
      return new Promise(function (resolve, reject) {
        MongoClient.connect(mongoUrl, either(reject).or(function (db) {
          resolve(db);
        }));
      });
    });
  },

};
