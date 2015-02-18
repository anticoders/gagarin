
var SourceMapGenerator = require('source-map').SourceMapGenerator;
var SourceMapConsumer  = require('source-map').SourceMapConsumer;

var crypto = require('crypto');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var path   = require('path');
var fs     = require('fs');

module.exports = function (codeFixtures, pathToBuild, done) {

  //rimraf.sync(path.join(pathToBuild, 'programs', 'server', 'gagarin'));
  //rimraf.sync(path.join(pathToBuild, 'programs', 'web.browser', 'gagarin'));

  var clientFixturesByPath = {};
  var serverFixturesByPath = {};

  codeFixtures.forEach(function (fixture) {
    var fixtures = fixture.where === 'server' ? serverFixturesByPath : clientFixturesByPath;
    if (!fixtures[fixture.path]) {
      fixtures[fixture.path] = [];
    }
    fixtures[fixture.path].push(fixture);
  });

  [ serverFixturesByPath, clientFixturesByPath ].forEach(function (fixtures, index) {

    Object.keys(fixtures).forEach(function (filePath) {
      applyCodeFixtures(pathToBuild, filePath, index === 0 ? 'server' : 'client', fixtures[filePath]);
    });

  });

  done();
}

function applyCodeFixtures(pathToBuild, filePath, where, listOfFixtures) {
  
  var pathToProgramsDir = path.join(pathToBuild, 'programs', where === 'server' ? 'server' : 'web.browser');
  var pathToProgramJSON = path.join(pathToProgramsDir, 'program.json');
  var pathToGagarin     = path.join(pathToProgramsDir, 'gagarin');

  var programJSON  = JSON.parse(fs.readFileSync(pathToProgramJSON, 'utf8'));

  var pathToInputSourceFile = path.join(pathToProgramsDir, filePath);
  var pathToInputSourceMap  = path.join(pathToProgramsDir, filePath + '.map');

  var pathToOutputSourceFile = path.join(pathToGagarin, filePath);
  var pathToOutputSourceMap  = path.join(pathToGagarin, filePath + '.map');

  var rawSourceMap = null;
  var parsedSourceMap = null;
  var sourceCode = null;

  mkdirp.sync(path.dirname(pathToOutputSourceFile));
  mkdirp.sync(path.dirname(pathToOutputSourceMap));

  if (fs.existsSync(pathToInputSourceMap)) {
    parsedSourceMap = JSON.parse(fs.readFileSync(pathToInputSourceMap, 'utf8').replace(/^\)\]\}'/, ''));
  } else {
    parsedSourceMap = null;
  }

  if (fs.existsSync(pathToInputSourceFile)) {
    sourceCode = fs.readFileSync(pathToInputSourceFile, 'utf8');
  } else {
    sourceCode = '';
  }

  var consumer = parsedSourceMap && new SourceMapConsumer(parsedSourceMap);
  var generator = consumer ? SourceMapGenerator.fromSourceMap(consumer) : new SourceMapGenerator();

  var myProgram = null;
  var listOfPrograms = where === 'server' ? programJSON.load : programJSON.manifest;

  listOfPrograms.some(function (program) {
    if (program.path === path.relative(pathToProgramsDir, pathToInputSourceFile) || program.path === path.relative(pathToProgramsDir, pathToOutputSourceFile)) {
      myProgram = program;
      return true;
    }
  });

  if (!myProgram) {
    myProgram = {};
    listOfPrograms.unshift(myProgram);
  }

  var hash = crypto.createHash('sha1');

  myProgram.path      = path.relative(pathToProgramsDir, pathToOutputSourceFile);
  myProgram.sourceMap = path.relative(pathToProgramsDir, pathToOutputSourceMap);

  if (where !== 'server') {
    myProgram.type  = 'js';
    myProgram.where = where;
    myProgram.cacheable = true;
  }

  var codeToAppend = '';

  listOfFixtures.forEach(function (fixture) {
    var code = typeof fixture.code === 'function' ? '(' + fixture.code.toString() + ')();' : fixture.code.toString();
    codeToAppend += '\n\n' + code + '\n\n';
  });

  sourceCode += '\n\n' + codeToAppend + '\n\n';

  hash.update(sourceCode);

  if (where !== 'server') {
    myProgram.hash = hash.digest('hex');
  }

  // TODO: restore the original chmod
  fs.chmodSync(pathToProgramJSON, '755');
  fs.writeFileSync(pathToProgramJSON, JSON.stringify(programJSON, undefined, 2));

  fs.writeFileSync(pathToOutputSourceFile, sourceCode);
  fs.writeFileSync(pathToOutputSourceMap, generator.toString());
}

/*
  rawSourceCode = rawSourceCode.replace(/(\/+\s+)(}\)\.call\(this\);\s+\/\* Exports \*\/)/, function (g0, g1, g2) {
    return g1 + g2;
  });

  generator.addMapping({
    generated: {
      line: i + lineNumber,
      column: 0
    },
    source: "gagarin/base64.js",
    original: {
     line: i,
     column: 0
    },
  });

  var index = rawSourceCode.indexOf('//// gagarin tests ////');
  var nLine = rawSourceCode.substr(0, index).split('\n').length;
*/

