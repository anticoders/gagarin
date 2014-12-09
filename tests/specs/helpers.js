describe('Helpers', function () {

  var server = meteor();
  var client = browser(server.location);

  it('should be able to use sendKeys', function () {
    return client
      .sendKeys('input[type=text]', 'abc')
      .expectValueToEqual('input[type=text]', 'abc');
  });

  it('should be able to use click', function () {
    return client
      .click('input[type=button]')
      .expectTextToContain('p', '1');
  });

});
