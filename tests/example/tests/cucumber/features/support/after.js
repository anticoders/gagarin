
var myAfterHooks = function () {
  this.After(function(callback) {
    var self = this;

    self.client.close().quit().then(function () {
      return self.server.stop().then(function () {
        callback();
      });
    });
    
  });
};

module.exports = myAfterHooks;
