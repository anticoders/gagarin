
var path = require('path');
var fs   = require('fs');

var allFixturesByName = {};
var listOfAllFixtures = [];

module.exports.register = function register (fileName, lineNumber, sourceCode) {

  if (fileName in allFixturesByName) {
    throw new Error('a fixture with name ' + fileName + ' already exists; names must be unique!');
  }

  var fixture = {
    fileName      : fileName,
    lineNumber    : lineNumber,
    sourceCode    : sourceCode,
    numberOfLines : sourceCode.split('\n').length,
  };

  listOfAllFixtures.push(fixture);

  allFixturesByName[fileName] = fixture;
}

module.exports.registerFile = function registerFile (name, filePath) {
  // TODO: since this goes into public API, verify arguments to help users
  // TODO: tell the users that we're expecting full path here
  module.exports.register(name, 1, fs.readFileSync(filePath, 'utf8'));
}

module.exports.getMatching = function getMatching (regex, ignore) {
  return listOfAllFixtures.filter(function (fixture) {
    return !ignore[fixture.fileName] && regex.test(fixture.fileName);
  });
}

module.exports.getByName = function getByName (name) {
  return allFixturesByName[name];
}

// register built in fixtures

var pathToFixtures = path.join(__dirname, 'built-in');

fs.readdirSync(pathToFixtures).forEach(function (file) {
  module.exports.registerFile('built-in/' + file, path.join(pathToFixtures, file));
});

module.exports.registerFile('built-in/mocha.js', path.resolve(__dirname, '../../node_modules/mocha/mocha.js'));
module.exports.registerFile('built-in/browser-source-map-support.js', path.resolve(__dirname, '../../node_modules/source-map-support/browser-source-map-support.js'));



