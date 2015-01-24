
describe('Initialization', function () {

  var a = 1, b = 1;

  closure(['a', 'b'], function (key, value) {
    return eval(key + (arguments.length > 1 ? '=' + JSON.stringify(value) : ''));
  });
  
  var server = meteor(function () {
    a = 2;
    Items.insert({_id: 'server'});
  });

  var client = browser(server, function (resolve, reject) {
    b = 2;
    Items.insert({_id: 'client'}, either(reject).or(resolve));
  });

  it('initialization should work on server', function () {
    return server.execute(function () {
      return Items.findOne({_id: 'server'});
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('should be able to use closure variables during server init script', function () {
    expect(a).to.equal(2);
  });

  it('initialization should work on client', function () {
    return server.execute(function () {
      return Items.findOne({_id: 'client'});
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('should be able to use closure variables during client init script', function () {
    expect(b).to.equal(2);
  });

});
