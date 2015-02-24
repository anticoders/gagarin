
var path = require('path');

var allFixturesByName = {};

module.exports.registerFileAs = function registerFileAs (name, pathToFile, insertAt, where) {

  // TODO: verify arguments

  var config = allFixturesByName[name];

  if (!config) {
    allFixturesByName[name] = config = { files: [] };
  }

  config.files.push({
    pathToFile : pathToFile,
    insertAt   : insertAt,
    where      : where,
  });
}

module.exports.forEachFile = function forEachFile (name, action) {
  if (!allFixturesByName[name]) {
    throw new Error('Fixture ' + name + ' does not exist. You need to choose one of:\n\n' + 
      Object.keys(allFixturesByName).join('\n')
    );
  }
  allFixturesByName[name].files.forEach(function (file) {
    action(file.pathToFile, file.insertAt, file.where);
  });
}

module.exports.registerFileAs('mocha', path.resolve(__dirname, '../../node_modules/mocha/mocha.js'), 'mocha.js', 'client');
module.exports.registerFileAs('mocha', path.resolve(__dirname, '../../node_modules/source-map-support/browser-source-map-support.js'), 'mocha.js', 'client');
module.exports.registerFileAs('mocha', path.resolve(__dirname, 'mocha-for-gagarin.js'), 'mocha.js', [ 'client', 'server' ]);
