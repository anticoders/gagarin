

module.exports = function () {

  this.World = require("../support/world.js").World;

  this.Given(/^I am on the home page$/, function(callback) {
    this.client.get('https://google.com').then(function () {
      callback();
    }, function(err) {
      callback.fail(err);
    });
  });


  this.Then(/^I should see something/, function (callback) {
    callback();
  });

};

