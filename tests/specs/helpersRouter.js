
describe('Built in Router helpers', function () {

  var server = meteor();
  var client = browser(server);

  it('should change the route and load correct template', function () {
    return client
      .waitForRoute('/test')
      .waitForDOM('#testRouteDiv')
      .getText('#testRouteDiv')
      .then(function(res) {
        expect(res).to.contain('Testing Iron Router');
      });
  });

  it('should be ok if routing to the current route', function () {
    return client
      .waitForRoute('/test')  
      .getText('#testRouteDiv')  // we shouldn't need to waitForDOM here
      .then(function(res) {
        expect(res).to.contain('Testing Iron Router');
      });
  });

  it('should be ok returning to previous route', function () {
    return client
      .waitForRoute('/')
      .waitForDOM('#getText')
  });

  it('should work with a specified timeout', function () {
    return client
      .waitForRoute('/test',3000)
      .waitForDOM('#testRouteDiv')
  });

});

