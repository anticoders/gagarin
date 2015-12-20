
var fs   = Npm.require('fs');
var path = Npm.require('path');

Package.describe({
  summary   : 'Collects data required to run Gagarin tests',
  name      : 'gagarin:probe',
  version   : '0.4.11',
  git       : 'https://github.com/anticoders/gagarin.git',
  debugOnly : true,
});

Package.onUse(function () {

  var pathToGagarin   = path.resolve('.gagarin');
  var pathToGitIgnore = path.join(pathToGagarin, '.gitignore');
  var pathToLocal     = path.join(pathToGagarin, 'local');
  var pathToProbe     = path.join(pathToLocal, 'probe.json');

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

      fs.writeFile(pathToProbe, JSON.stringify({
        pathToNode: process.argv[0]
      }, null, 2));

    });

  });

});



