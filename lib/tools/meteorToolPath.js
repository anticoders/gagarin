
var sqlite3 = require('sqlite3');
var path = require('path');
var vm = require('vm');
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

  var dbFile = runInIsolatedContext(function (require, pathToConfig) {
    return require(pathToConfig).getPackageStorage();
  }, [ require, path.join(mtPath, 'config') ]);

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

    var feedback = runInIsolatedContext(function (require, root, toolsPkg, toolsVersion) {
      "use strict"
      var path         = require('path');
      var config       = require(path.join(root, 'config'));
      var isopack      = require(path.join(root, 'isopack'));
      var tropohouse   = require(path.join(root, 'tropohouse'));
      var packagePath  = tropohouse.default.packagePath(toolsPkg, toolsVersion);
      var toolIsopack  = new isopack.Isopack;

      toolIsopack.initFromPath(toolsPkg, packagePath);
      return {
        toolsOnDisk: toolIsopack.toolsOnDisk,
        packagePath: packagePath
      };
    }, [ require, mtPath, toolsPkg, toolsVersion ]);

    var toolRecord = _.findWhere(feedback.toolsOnDisk, { arch: arch });

    if (!toolRecord) {
      return callback(new Error('cannot find tool for arch ' + arch));
    }

    db.close(function () {
      callback(null, path.join(feedback.packagePath, toolRecord.path));
    });
  });
}

function runInIsolatedContext (func, args) {
  var code = '(' + func.toString() + ')';
  return vm.runInNewContext(code).apply({}, args);
}
