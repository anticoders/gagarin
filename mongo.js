var MongoClient = require('mongodb').MongoClient;
var debounce = require('debounce');
var Promise = require('es6-promise').Promise;
var mkdirp = require('mkdirp');
var spawn = require('child_process').spawn;
var path = require('path');
var tools = require('./tools');
var either = tools.either;
var fs = require('fs');

var mongoServerPromise = null;

module.exports = function MongoServerAsPromise (options) {

  if (mongoServerPromise) {
    // XXX there can be only one mongo process using the given database path
    return Promise.resolve(mongoServerPromise);
  }

  var pathToGitIgnore = tools.getPathToGitIgnore(options.pathToApp);
  var mongoPort       = options.dbPort || 27018 + Math.floor(Math.random() * 1000);
  var mongoPath       = tools.getMongoPath(options.pathToApp);
  var pathToDB        = options.dbPath || tools.getPathToDB(options.pathToApp);
  var mongoUrl        = 'mongodb://127.0.0.1:' + mongoPort;
  
  if (!fs.existsSync(mongoPath)) {
    return Promise.reject(new Error('file ' + mongoPath + ' does not exists'));
  }

  //-----------------------------------------------------------
  mongoServerPromise = new Promise(function (resolve, reject) {
    var mongoArgs = [ '--port', mongoPort, '--smallfiles', '--nojournal', '--noprealloc' ];

    try {
      if (!fs.existsSync(pathToGitIgnore)) {
        // make sure the directory exists
        mkdirp.sync(path.dirname(pathToGitIgnore));
        // make sure "local" directory is ignored by git
        fs.writeFileSync(pathToGitIgnore, 'local');
      }
      mkdirp.sync(pathToDB);
    } catch (err) {

      return reject(err);
    }

    pathToDB && mongoArgs.push('--dbpath', path.resolve(pathToDB));

    var mongoProcess = spawn(mongoPath || 'mongod', mongoArgs);

    // use debounce to give the process some time in case it exits prematurely
    mongoProcess.stdout.on('data', debounce(function (data) {
      resolve(mongoUrl);
    }, 100));

    // on premature exit, reject the promise
    mongoProcess.on('exit', function (code) {
      code && reject(new Error("mongo exited with code: " + code));
    });

    // make sure mongoProcess is killed if the parent process exits
    process.on('exit', function () {
      mongoProcess.kill();
    });

  });

  mongoServerPromise.connectToDB = function (dbName) {
    return mongoServerPromise.then(function (mongoUrl) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(mongoUrl + '/' + dbName, either(reject).or(resolve));
      });
    });
  };

  return mongoServerPromise;
};
