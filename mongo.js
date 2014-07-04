var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var exec = require('child_process').exec;
var path = require('path');

module.exports = {

  Server: function (options) {
    var port = 27017; // pick random?
    return new Promise(function (resolve, reject) {
      //var db_path = path.resolve(options.db_path);
      var mongod = exec('mongod', [
        //'--dbpath', db_path,
        '--port', port,
        '--smallfiles',
        '--nojournal',
        '--noprealloc',
      ]);
      mongod.stdout.on('data', function (data) {
        if (/all output going to/.test(data.toString())) {
          resolve(new MongoHandle(mongod, port));
        }
      });
    });
  },

  connect: function (mongod, db_name) {
    return mongod.then(function (handle) {
      var mongoUrl = 'mongodb://127.0.0.1:' + handle.port + '/' + db_name;
      return new Promise(function (resolve, reject) {
        MongoClient.connect(mongoUrl, function (err, db) {
          if (err) {
            reject(err);
          } else {
            resolve(new DatabaseHandle(db, mongoUrl));
          }
        });
      });
    });
  },

};

function MongoHandle(mongod, port) {
  this.port = port;
  this.kill = function () {
    return new Promise(function (resolve, reject) {
      mongod.once('error', function () {
        reject();
      });
      mongod.once('exit', function () {
        resolve();
      });
      mongod.kill();
    });
  }
}

function DatabaseHandle(db, mongoUrl) {
  this.mongoUrl = mongoUrl;
  this.drop = function () {
    return new Promise(function (resolve, reject) {
      db.dropDatabase(function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      })
    });
  }
}
