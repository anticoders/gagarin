

var Meteor  = require('../../../../../../lib/meteor');
var Browser = require('../../../../../../lib/browser');

var World = function World (callback) {

  this.server = new Meteor({
    
  });

  this.client = new Browser({
    location: this.server
  });

  callback();

};

module.exports.World = World;
