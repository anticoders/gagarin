var fs   = Npm.require('fs');
var path = Npm.require('path');

var pathToGagarin    = path.resolve('.gagarin');
var pathToGitIgnore  = path.join(pathToGagarin, '.gitignore');
var pathToLocal      = path.join(pathToGagarin, 'local');
var pathToTrajectory = path.join(pathToLocal, 'trajectory.json');

fs.mkdir(pathToGagarin, function (e) {
  'use strict';
  
  if (e && e.code !== 'EEXIST') {
    console.error(e.stack);
    return;
  }

  fs.mkdir(pathToLocal, function (e) {
    
    if (e && e.code !== 'EEXIST') {
      console.error(e.stack);
      return;
    }

    fs.stat(pathToGitIgnore, function (e) {
      if (e && e.code !== 'ENOENT') {
        console.error(e.stack);
        return;
      }
      fs.writeFile(pathToGitIgnore, 'local\n');
    });

    fs.writeFile(pathToTrajectory, JSON.stringify({
      pathToNode: process.argv[0]
    }, null, 2));

  });
});
