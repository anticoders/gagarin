
var path = reqire('path');

exports.getPathToLocalDir = function (pathToApp) {
  return path.join('.gagarin', 'local');
}

exports.getPathToBuildDir = function (pathToApp) {
  return path.join(exports.getPathToLocalDir(pathToApp), 'build');
}


