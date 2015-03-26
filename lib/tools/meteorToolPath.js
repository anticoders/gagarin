
var sqlite3 = require('sqlite3');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

/**
 * This is more ore less what meteor "main.js" does to detect
 * the meteor-tool version corresponding to the releaseName.
 * This function must me run inside a Fiber!
 */
module.exports = function getMeteorToolPath (home, releaseName, callback) {
  "use strict";

  var pathToMeteor  = path.join(home, '.meteor');
  var meteorSymLink = path.join(pathToMeteor, fs.readlinkSync(path.join(pathToMeteor, 'meteor')));

  var track      = releaseName.split('@')[0];
  var version    = releaseName.split('@')[1];
  var components = _.initial(meteorSymLink.split(path.sep));
  var mtPath     = '/' + path.join.apply(path, components.concat([ 'tools' ]));
  var arch       = _.last(_.last(components).split('-'));

  var dbFile = path.join(home, '.meteor', 'package-metadata', 'v2.0.1', 'packages.data.db');

  var db = new sqlite3.Database(dbFile);

  db.all('SELECT content FROM releaseVersions WHERE track="' + track + '" AND version="' + version + '"', {}, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (result.lenth === 0) {
      return callback(new Error('cannot find relase ' + releaseName));
    }

    var release      = JSON.parse(result[0].content);
    var toolsPkg     = release.tool.split('@')[0];
    var toolsVersion = release.tool.split('@')[1];
    var packagePath  = path.join(home, '.meteor', 'packages', toolsPkg, toolsVersion);
    var isopackPath  = path.join(packagePath, 'isopack.json');
    var isopackJSON  = JSON.parse(fs.readFileSync(isopackPath, 'utf8'));
    var toolRecord   = _.findWhere(isopackJSON['isopack-1'].tools, { arch: arch });

    if (!toolRecord) {
      return callback(new Error('cannot find tool for arch ' + arch));
    }

    db.close(function () {
      callback(null, path.join(packagePath, toolRecord.path));
    });
  });
}
