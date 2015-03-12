
describe('A test suite for my-package.', function () {
  "use strict";

  before(function () {
    thisIsSomePrivateVariable = 0;
  });

  it('should be able to use "doSomething" method', function () {
    if (MyPackage.doSomething(1) !== 1) {
      throw new Error('expected MyPackage.doSomething() to equal 1')
    }
  });

  it('the private variable should be increased as well', function () {
    if (thisIsSomePrivateVariable !== 1) {
      throw new Error('expected thisIsSomePrivateVariable to equal 1')
    }
  });

  it('should throw an error', function () {
    throw new Error('we are expecting this error');
  });

});