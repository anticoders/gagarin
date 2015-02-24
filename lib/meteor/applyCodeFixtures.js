
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

  var clientProgramJSON = getProgramJSON(pathToBuild, 'client');
  var serverProgramJSON = getProgramJSON(pathToBuild, 'server');

  restoreProgramJSON(clientProgramJSON.manifest);
  restoreProgramJSON(serverProgramJSON.load);

  writeProgramJSON(pathToBuild, 'client', clientProgramJSON);
  writeProgramJSON(pathToBuild, 'server', serverProgramJSON);

  var clientFixturesByPath = {};
  var serverFixturesByPath = {};

  codeFixtures.forEach(function (fixture) {
    var fixtures = fixture.where === 'server' ? serverFixturesByPath : clientFixturesByPath;
    var split    = fixture.path.split(path.sep);
    var myPath   = fixture.path;

    if (split[0] !== 'packages') {
      myPath = path.join('app', myPath);
    }

    if (!fixtures[myPath]) {
      fixtures[myPath] = [];
    }
    fixtures[myPath].push(fixture);
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

  var programJSON = JSON.parse(fs.readFileSync(pathToProgramJSON, 'utf8'));

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

    if (program.path === path.relative(pathToProgramsDir, pathToInputSourceFile) ||
        program.path === path.relative(pathToProgramsDir, pathToOutputSourceFile)) {

      myProgram = program;
      return true;
    }
  });

  if (!myProgram) {
    myProgram = {};
    listOfPrograms.unshift(myProgram);
  } else {
    myProgram._gagarin_backup = JSON.parse(JSON.stringify(myProgram));
  }

  var hash = crypto.createHash('sha1');

  myProgram.path      = path.relative(pathToProgramsDir, pathToOutputSourceFile);
  myProgram.sourceMap = path.relative(pathToProgramsDir, pathToOutputSourceMap);

  if (where !== 'server') {
    myProgram.type      = 'js';
    myProgram.where     = where;
    myProgram.cacheable = true;
  }

  var looksLikeAppCode = /\}\)\(\);\s+(\/\/.*\n)*$/.exec(sourceCode);
  var looksLikePackage = /\}\)\.call\(this\);\s+\/\* Exports \*\//.exec(sourceCode);

  var appendAtIndex = sourceCode.length; // by default append at the end

  if (looksLikeAppCode) {
    appendAtIndex = looksLikeAppCode.index;
  }

  if (looksLikePackage) {
    appendAtIndex = looksLikePackage.index;
  }

  var codeBefore   = sourceCode.substr(0, appendAtIndex);
  var codeAfter    = sourceCode.substr(appendAtIndex, sourceCode.length);
  var codeToAppend = '';
  var totalNumberOfLines = codeBefore.split('\n').length;

  listOfFixtures.forEach(function (fixture) {
    
    var code = typeof fixture.code === 'function' ? ';(' + fixture.code.toString() + ')();' : fixture.code.toString();

    generator.setSourceContent(fixture.file, code);

    var nLines = code.split('\n').length, i = 0;

    for (i = 0; i < nLines; i++) {
      generator.addMapping({
        source    : fixture.file,
        original  : { column: 0, line: i + fixture.line },
        generated : { column: 0, line: i + 1 + totalNumberOfLines },
      });
    }

    totalNumberOfLines += nLines;
    codeToAppend += '\n' + code;
  });

  sourceCode = codeBefore + codeToAppend + '\n\n' + codeAfter;

  hash.update(sourceCode);

  if (where !== 'server') {
    myProgram.hash = hash.digest('hex');
    myProgram.size = sourceCode.length;
    myProgram.url  = '/' + myProgram.path + '?' + myProgram.hash;

    // TODO: think if we should use some prefix for this guy ...
    myProgram.sourceMapUrl = '/' + myProgram.hash + '.map';
  }

  // TODO: restore the original chmod
  fs.chmodSync(pathToProgramJSON, '755');
  fs.writeFileSync(pathToProgramJSON, JSON.stringify(programJSON, undefined, 2));

  fs.writeFileSync(pathToOutputSourceFile, sourceCode);
  fs.writeFileSync(pathToOutputSourceMap, generator.toString());
}

function getProgramJSON (pathToBuild, where) {
  var pathToProgramJSON = path.join(pathToBuild, 'programs', where === 'server' ? 'server' : 'web.browser', 'program.json');
  return JSON.parse(fs.readFileSync(pathToProgramJSON, 'utf8'));
}

function writeProgramJSON (pathToBuild, where, programJSON) {
  var pathToProgramJSON = path.join(pathToBuild, 'programs', where === 'server' ? 'server' : 'web.browser', 'program.json');
  // make sure we can write to this file
  fs.chmodSync(pathToProgramJSON, '755');
  fs.writeFileSync(pathToProgramJSON, JSON.stringify(programJSON, undefined, 2));
}

function arrangeByProperty (property, listOfObjects) {
  var data = {};
  listOfObjects.forEach(function (object) {
    data[object[property]] = object;
  });
  return data;
}

function restoreProgramJSON (loadOrManifest) {
  var i;
  if (!loadOrManifest) {
    return;
  }
  for (i=0; i<loadOrManifest.length; i++) {
    if (loadOrManifest[i]._gagarin_backup) {
      loadOrManifest[i] = loadOrManifest[i]._gagarin_backup;
    }
  }
}
