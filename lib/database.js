
/**
 * Module dependencies.
 */

var MongoServerAsPromise = require('./mongo');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var url = require('url');

/**
 * Creates a new database promise.
 * @param {Object} options
 *
 * Options:
 * - {String} mongoUrl
 * - {String} pathToApp
 * - {String} dbName
 */
module.exports = function DatabaseAsPromise (options) {
  "use strict";

  options = options || {};

  var dbName       = options.dbName    || getRandomName();
  var mongoUrl     = options.mongoUrl  || '';
  var pathToApp    = options.pathToApp || path.resolve('.');
  var parsedUrl    = null;
  var getMongoUrl  = null;
  var needsCleanup = false;

  if (mongoUrl) {
    parsedUrl = url.parse(mongoUrl);
    parsedUrl.path = parsedUrl.path || dbName;
    //---------------------------------------------------
    getMongoUrl = Promise.resolve(url.format(parsedUrl));
  } else {
    needsCleanup = true;
    //--------------------------------------------------------------
    getMongoUrl = new MongoServerAsPromise({ pathToApp: pathToApp })
      .then(function (mongoUrl) {
        return mongoUrl + '/' + dbName;
      });
  }

  return getMongoUrl.then(function (mongoUrl) {
    return new Promise(function (resolve, reject) {
      MongoClient.connect(mongoUrl, function (err, db) {
        if (err) {
          return reject(err);
        }
        db.cleanUp = function (cb) {
          if (needsCleanup) {
            db.dropDatabase(cb);
          } else {
            db.close(cb);
          }
        }
        resolve(db);
      });
    });
  });

};

function getRandomName() {
  return 'gagarin_' + Math.floor(1000 * Math.random()) + '_' + (new Date()).getTime();
}
