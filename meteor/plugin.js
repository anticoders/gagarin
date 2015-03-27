var fs = Npm.require('fs');
var path = Npm.require('path');

var pathToGagarin   = path.resolve('.gagarin');
var pathToGitIgnore = path.join(pathToGagarin, '.gitignore');
var pathToLocal     = path.join(pathToGagarin, 'local');
var pathToArtifacts = path.join(pathToLocal, 'artifacts.json');

mkdirSync(pathToGagarin);
mkdirSync(pathToLocal);

// TODO: since "exists" is getting deprecated, lets figure out
//       how we can do it without checking for existance first

if (!fs.existsSync(pathToGitIgnore)) {
  fs.writeFileSync(pathToGitIgnore, 'local\n');  
}

fs.writeFileSync(pathToArtifacts, JSON.stringify({

  pathToDevBundle: process.argv[0].replace(/\/bin\/node$/, ''),

}, undefined, 2));

// http://stackoverflow.com/questions/13696148/node-js-create-folder-or-use-existing

function mkdirSync (path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}
