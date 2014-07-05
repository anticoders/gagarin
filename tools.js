var fs = require('fs');

module.exports = {
  
  getConfig: function () {
    var data;
    var path = './.gagarin/gagarin.json';
    if (fs.existsSync(path)) {
      data = fs.readFileSync(path);
      data = JSON.parse(data);
    }
    return data || {};
  },
  
};
