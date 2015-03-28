describe('Node', function () {

  var server = meteor();

  it('it should use node version', function () {
    return server.execute(function () {
      return process.version;
    }).then(function (version) {
      expect(version).to.match(/0\.10\.36/)
    });
  })

});
