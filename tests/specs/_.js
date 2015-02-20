var path = require('path');
var fs   = require('fs');

var pathToFixtures = path.resolve(__dirname, '../fixtures');

fs.readdirSync(pathToFixtures).forEach(function (file) {
  fixtures.registerFile(file, path.join(pathToFixtures, file));
});
