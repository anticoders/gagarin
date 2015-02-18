var path = require('path');
var fs   = require('fs');

module.exports.get = function (name) {
  return fs.readFileSync(path.resolve(__dirname, name + '.js'), 'utf8');
}
