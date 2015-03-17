
describe('Using expectError helper', function () {

  var server = meteor();

  it('should throw error if wrong parameter is used', function () {
    expect(function () {
      server.expectError(123);
    }).throw(/must be/);
  });

  it('should throw an error if no error is thrown', function () {
    return server.expectError().then(function () {
      throw new Error('error was not thrown');
    }, function (err) {
      expect(err.message).to.contain('was not thrown');
    });
  });

  it('should throw if wrong type of object is thrown', function () {
    return server.then(function () {
      throw "this is not a valid error";
    }).expectError().then(function () {
      throw new Error('error was not thorwn');
    }, function (err) {
      expect(err.message).to.contain('instance of Error');
    });
  });

  it('may be used with no arguments', function () {
    return server.then(function () {
      throw new Error('just a fake error');
    }).expectError();
  });

  it('may be used with string as an argument', function () {
    return server.then(function () {
      throw new Error('just a fake error');
    }).expectError('just a fake error');
  });

  it('should throw if the string is not contained in err.message', function () {
    return server.then(function () {
      throw new Error('just a fake error');
    }).expectError('thisTextIsNotContainedInErrorMessage').then(function () {
      throw new Error('error was not thrown');
    }, function (err) {
      expect(err.message).to.contain('to include');
    });
  });

  it('may be used with RegExp as an argument', function () {
    return server.then(function () {
      throw new Error('just a fake error');
    }).expectError(/error$/);
  });

  it('should throw if the RegExp does not match err.message', function () {
    return server.then(function () {
      throw new Error('just a fake error');
    }).expectError(/^error/).then(function () {
      throw new Error('error was not thrown');
    }, function (err) {
      expect(err.message).to.contain('to match');
    });
  });

});
