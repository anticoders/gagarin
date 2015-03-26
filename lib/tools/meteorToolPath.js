var path = require('path');
var fs = require('fs');
var _ = require('lodash');

/**
 * This is more ore less what meteor "main.js" does to detect
 * the meteor-tool version corresponding to the releaseName.
 * This function must me run inside a Fiber!
 */
module.exports = function getMeteorToolPath (home, releaseName) {

  var pathToMeteor  = path.join(home, '.meteor');
  var meteorSymLink = path.join(pathToMeteor,
      fs.readlinkSync(path.join(pathToMeteor, 'meteor')));

  // guess the lastest meteor tool path
  var mtPath = '/' + path.join.apply(path,
    _.initial(meteorSymLink.split(path.sep)).concat([ 'tools' ]));

  // import some useful meteor modules from meteor tools

  var release    = require(path.join(mtPath, 'release'));
  var catalog    = require(path.join(mtPath, 'catalog'));
  var isopack    = require(path.join(mtPath, 'isopack'));
  var archinfo   = require(path.join(mtPath, 'archinfo'));
  var tropohouse = require(path.join(mtPath, 'tropohouse'));

  // fisrt, initialize sqlite3 database client

  catalog.official.initialize({ offline: true });

  // here we are doing the same thing, meteor springboard has to do ...

  var rel          = release.load(releaseName);
  var toolsPkg     = rel.getToolsPackage();
  var toolsVersion = rel.getToolsVersion();
  var packagePath  = tropohouse.default.packagePath(toolsPkg, toolsVersion);
  var toolIsopack  = new isopack.Isopack;

  toolIsopack.initFromPath(toolsPkg, packagePath);

  var toolRecord = _.findWhere(toolIsopack.toolsOnDisk, {arch: archinfo.host()});

  return path.join(packagePath, toolRecord.path);
}
