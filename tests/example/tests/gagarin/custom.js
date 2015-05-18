describe('Custom.', function () {

  var db = mongo();

  var server1 = meteor({
    mongoUrl: db.getMongoUrl(),
  });

  var server2 = meteor({
    mongoUrl: db.getMongoUrl(),
  });

  /*var client1 = browser({
    location: server1.getRootUrl(),
  });

  var client2 = browser({
    location: server2.getRootUrl(),
  });*/

  it('should work fine', function () {});

});
