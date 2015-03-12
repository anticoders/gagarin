
describe('Super duper test suite', function () {
  var i = 0;
  for (i = 0; i < 30; i++) {
    (function (i) {
      it('should just work ' + i, function (done) { setTimeout(done, 2 * i); });
      it('should throw an error', function (done) {
        setTimeout(function () {
          done(new Error('this is a simulated error'));
        }, 2 * i);
      });
    })(i);
  }
});
