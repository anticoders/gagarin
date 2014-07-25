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

  either: function (first) {
    return {
      or: function (second) {
        return function (arg1, arg2) {
          return arg1 ? first(arg1) : second(arg2);
        };
      }
    };
  },

};
