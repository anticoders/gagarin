
describe('Running code on a remote server', function () {

  this.timeout(10000);

  var server = meteor({
    remoteServer: 'https://vostok-1.meteor.com'
  });

  it('execute should work', function () {
    return server.execute(function () {
      return Meteor.release;
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('db insert should work', function () {
    return server.execute(function () {
      return Items.insert({vostok: Random.id()});
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('promise should work', function () {
    return server.promise(function (resolve, reject) {
      Meteor.setTimeout(function () {
        resolve(Meteor.release);
      }, 100);
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

  it('should throw a descriptive error', function () {
    return server.execute(function () {
      undefined[0];
    }).expectError(function (err) {
      expect(err.toString()).to.contain('property');
    });
  });

});
