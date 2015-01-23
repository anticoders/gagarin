var MongoClient = require('mongodb').MongoClient;
var debounce = require('debounce');
var Promise = require('es6-promise').Promise;
var mkdirp = require('mkdirp');
var spawn = require('child_process').spawn;
var path = require('path');
var tools = require('./tools');
var either = tools.either;
var fs = require('fs');

var myMongoServerPromises = {};

module.exports = function MongoDBProcess (options) {
  "use strict";

  options = options || {};

  var pathToApp = options.pathToApp || path.resolve('.');

  if (myMongoServerPromises[pathToApp]) {
    // XXX there can be only one mongo process using the given database path
    return myMongoServerPromises[pathToApp];
  }

  var pathToGitIgnore = tools.getPathToGitIgnore(pathToApp);
  var mongoPort       = options.dbPort || 27018 + Math.floor(Math.random() * 1000);
  var mongoPath       = tools.getMongoPath(pathToApp);
  var pathToDB        = options.dbPath || tools.getPathToDB(pathToApp);
  var mongoUrl        = 'mongodb://127.0.0.1:' + mongoPort;
  
  if (!fs.existsSync(mongoPath)) {
    return Promise.reject(new Error('file ' + mongoPath + ' does not exists'));
  }

  //-------------------------------------------------------------------------
  myMongoServerPromises[pathToApp] = new Promise(function (resolve, reject) {
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

    var numberOfRetries = 10;

    function connectWithRetry () {
      if (numberOfRetries < 0) {
        return reject(new Error('cannot connect to ' + mongoUrl + '... giving up'));
      }
      MongoClient.connect(mongoUrl + '/test', function (err, db) {
        if (err) {
          setTimeout(connectWithRetry, 100);
        } else {
          db.close(function () {
            resolve(mongoUrl);
          });
        }
      });
    };

    mongoProcess.stdout.on('data', debounce(once(connectWithRetry), 1000));

    // on premature exit, reject the promise
    mongoProcess.on('exit', function (code) {
      code && reject(new Error("mongo exited with code: " + code));
    });

    // make sure mongoProcess is killed if the parent process exits
    process.on('exit', function () {
      mongoProcess.kill();
    });

  });

  return myMongoServerPromises[pathToApp];
};

/**
 * Make a version of function that can only be called once.
 */
function once (cb) {
  var done = false;
  return function () {
    if (done) {
      return;
    }
    done = true;
    return cb.apply(this, arguments);
  }
}
