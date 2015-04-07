
if (typeof Npm !== 'undefined') {
  chai = Npm.require('chai');
}

describe('Super duper test suite', function () {

  it('should just work', function (done) { setTimeout(done, 100); });
  
  it('should throw an error', function (done) {
    setTimeout(function () {
      done(new Error('this is a simulated error'));
    }, 100);
  });

  it('should not be equal', function () {
    chai.expect("abc").to.equal("x");
  });

});
