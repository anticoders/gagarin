
/**
 * Module dependencies.
 */

var MongoDBProcess = require('./mongoDBProcess');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('es6-promise').Promise;
var url = require('url');
var cleanup = require('../meteor/cleanup');
var path = require('path');
var fs = require('fs');
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

  process.registerCleanup(function(done){
    var pathToDb = path.join(pathToApp || module.exports.getUserHome(), '.gagarin', 'local', 'db');
    fs.unlink(pathToDb+'/'+dbName+'.0',function(){
      fs.unlink(pathToDb+'/'+dbName+'.ns',function(){
        done();
      })
    });
  });

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

  databasePromise.getMongoUrlPromise = function () {
    return mongoUrlPromise;
  };

  return databasePromise;
};

function getRandomName() {
  return 'gagarin_' + Math.floor(1000 * Math.random()) + '_' + (new Date()).getTime();
}
