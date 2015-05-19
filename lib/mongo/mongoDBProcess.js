var MongoClient = require('mongodb').MongoClient;
var findAvailablePort   = require('../tools').findAvailablePort;
var debounce = require('debounce');
var Promise = require('es6-promise').Promise;
var mkdirp = require('mkdirp');
var spawn = require('child_process').spawn;
var path = require('path');
var tools = require('../tools');
var either = tools.either;
var fs = require('fs');
var cleanup = require('../cleanup')
var _ = require('lodash');

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
  var mongoPort       = options.dbPort;
  var pathToDB        = options.dbPath || tools.getPathToDB(pathToApp);

  //-------------------------------------------------------------------------
  myMongoServerPromises[pathToApp] = new Promise(function (resolve, reject) {

    Promise.all([

      // find mongodb executable
      tools.getMongoPath(pathToApp),

      // find available port or use the one provided by user
      mongoPort ? Promise.resolve(mongoPort) : findAvailablePort()

    ]).then(function (results) {

      var mongoPath = results[0];
      var bindIp    = '127.0.0.1';

      mongoPort = results[1];

      if (!fs.existsSync(mongoPath)) {
        throw new Error('file ' + mongoPath + ' does not exists');
      }

      var mongoUrl  = 'mongodb://127.0.0.1:' + mongoPort;
      var mongoArgs = [
          '--port', mongoPort,
          '--smallfiles',
          '--bind_ip', bindIp,
          //'--nojournal',
          //'--noprealloc',
          '--oplogSize', 8,
          '--replSet', 'meteor'
      ];

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

      var mongoProcess = spawn(mongoPath || 'mongod', mongoArgs, { detached: true });

      // make sure mongoProcess is killed if the parent process exits or receives SIGINT
      var cleanupTask = cleanup.addTask(function (done) {
        this.describe('killing mongod process at ' + mongoUrl);
        // drop "local" database if it's possible ...
        MongoClient.connect(mongoUrl + '/local', function (err, db) {
          if (err) {
            mongoProcess.kill('SIGINT');
            done();
            return;
          }
          db.dropDatabase(function () {
            mongoProcess.kill('SIGINT');
            done();
          });
        });

      });

      // use debounce to give the process some time in case it exits prematurely

      var numberOfRetries = 10;

      function connectWithRetry () {
        if (numberOfRetries < 0) {
          return reject(new Error('cannot connect to ' + mongoUrl + '... giving up'));
        }
        MongoClient.connect(mongoUrl + '/local', function (err, db) {
          if (err) {
            setTimeout(connectWithRetry, 100);
          } else {
            db.admin().command({ replSetInitiate: {
              _id     : 'meteor',
              members : [{
                _id      : 0,
                host     : bindIp + ':' + mongoPort,
                priority : 100
              }]
            }}, function (err, res) {
              // TODO: res may also contain error msg ... if so reject
              if (err) {
                reject(err);
                return;
              }
              // TODO: do not continue forever ...
              // TODO: be more clever about "myState" (see how it's implemented in meteor)
              (function next () {
                db.admin().command({replSetGetStatus: 1}, function (err, status) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  if (_.get(status, 'documents.0.myState') === 1) {
                    resolve(mongoUrl);
                  } else {
                    setTimeout(next, 20);
                  }
                });
              })();
            });
          }
        });
      };

      mongoProcess.stdout.on('data', debounce(tools.once(connectWithRetry), 1000));

      // TODO: get rid of this log before the next release
      mongoProcess.stderr.on('data', function (data) {
        console.log(data.toString());
      });

      // on premature exit, reject the promis
      mongoProcess.on('exit', function (code) {
        cleanupTask.cancel();
        reject(new Error("mongo exited with code: " + code));
      });

    }).catch(reject);

  }); // new Promise

  return myMongoServerPromises[pathToApp];
};
