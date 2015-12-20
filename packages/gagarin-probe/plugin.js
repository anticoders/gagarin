'use strict';

var path            = Npm.require('path');
var fs              = Npm.require('fs');
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

// NOTE: we might as well use the following source handler
//       but this would require the application developer
//       to explicitly add "the.gagarin.probe" file, which
//       is quite inconvenient; anyway, let's consider this
//       the "plan B" if the current strategy stops
//       working properly for any reason

// Plugin.registerSourceHandler('gagarin.probe', function (compileStep) {
//   compileStep.addAsset({
//     path: compileStep.inputPath,
//     data: JSON.stringify({
//       pathToNode: process.argv[0],
//     }, null, 2)
//   });
// });

