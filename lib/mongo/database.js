
/**
 * Module dependencies.
 */

var MongoDBProcess = require('./mongoDBProcess');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var cleanup = require('../cleanup');
var logs = require('../logs');
var url = require('url');
var _ = require('lodash');

/**
 * Creates a new database promise.
 * @param {Object} options
 *
 * Options:
 * - {String} mongoUrl
 * - {String} pathToApp
 * - {String} dbName
 */
module.exports = function MongoDatabase (options) {
  "use strict";

  options = options || {};

  var dbName          = options.dbName    || getRandomName();
  var mongoUrl        = options.mongoUrl  || '';
  var pathToApp       = options.pathToApp || path.resolve('.');
  var parsedUrl       = null;
  var mongoUrlPromise = null;
  var needsCleanup    = false;

  if (mongoUrl) {
    parsedUrl = url.parse(mongoUrl);
    parsedUrl.path = parsedUrl.path || dbName;
    //-------------------------------------------------------
    mongoUrlPromise = Promise.resolve(url.format(parsedUrl));
  } else {
    needsCleanup = true;
    //------------------------------------------------------------
    mongoUrlPromise = new MongoDBProcess({ pathToApp: pathToApp })
      .then(function (mongoUrl) {
        return mongoUrl + '/' + dbName;
      });
  }

  var databasePromise = mongoUrlPromise.then(function (mongoUrl) {
    return new Promise(function (resolve, reject) {

      MongoClient.connect(mongoUrl, function (err, db) {

        if (err) {
          return reject(err);
        }

        logs.system("connected to database at " + mongoUrl);

        var closeDbTask = cleanup.addTask(function (done) {
          db.close(done);
        });

        var clearDbTask = cleanup.addTask(function (done) {
          this.describe('dropping database ' + mongoUrl);
          db.dropDatabase(done);
        });

        db.cleanUp = function (cb) {
          clearDbTask().then(function () {
            return closeDbTask();
          }).then(_.partial(cb, null), cb);
        }

        resolve(db);
      });
    });
  });

  databasePromise.getMongoUrlPromise = function () {
    return mongoUrlPromise;
  };

  return databasePromise;
};

function getRandomName() {
  return 'gagarin_' + Math.floor(1000 * Math.random()) + '_' + (new Date()).getTime();
}
