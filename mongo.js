var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var spawn = require('child_process').spawn;
var path = require('path');

module.exports = {

  Server: function (options) {
    var port = 27018 + Math.floor(Math.random() * 1000);
    return new Promise(function (resolve, reject) {
      var mongod;
      var args = [
        '--port', port,
        '--smallfiles',
        '--nojournal',
        '--noprealloc',
      ];
      if (options.dbPath) {
        args.push('--dbpath', path.resolve(options.dbPath));
      }
      mongod = spawn(options.mongoPath || 'mongod', args);  
      mongod.stdout.on('data', function (data) {
        // TODO: check if this works fine on MacOS
        if (/waiting for connections/.test(data.toString())) {
          resolve(new MongoHandle(mongod, port));
        }
      });
      process.on('exit', function () {
        // make sure mongod is killed as well
        mongod.kill();
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
