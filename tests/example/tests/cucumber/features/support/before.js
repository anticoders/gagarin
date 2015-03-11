
var myBeforeHooks = function () {
  this.Before(function(callback) {
    var self = this;

    self.server.init().then(function () {
      callback();
    }, function (err) {
      callback.fail(err);
    });
    
  });
};

module.exports = myBeforeHooks;
