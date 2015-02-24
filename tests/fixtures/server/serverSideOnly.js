
describe('Server side only test suite', function () {
  
  it('should be able to access local variables', function () {
    if (someLocalVariable !== 'server') {
      throw new Error('expected someLocalVariable to equal "server"');
    }
  });

  it('should fail', function () {
    throw new Error('this error was thrown on purpose');
  });

});
