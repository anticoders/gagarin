describe('Closure', function () {

  var server = meteor();

  var a = Math.random();
  var b = Math.random();
  var c = Math.random();
  var d = Math.random();

  var zero  = 0;

  var v_undefined = undefined;
  var v_null      = null;

  closure(['a', 'b', 'c', 'd', 'zero', 'v_undefined', 'v_null'], function (expr) { return eval(expr); });

  describe('Closure hierarchy', function () {
    
    var a2 = 1;
    var b2 = 2;
    var c2 = 3;

    closure(['a2', 'b2', 'c2'], function (expr) { return eval(expr); });

    it('should be able to use the new variables', function () {
      return server.execute(function () {
        return a2 + b2 + c2;
      }).then(function (value) {
        expect(value).to.equal(6);
      });
    });

    it('should be able to access the parent variables as well', function () {
      return server.execute(function () {
        return a + b + c;
      }).then(function (value) {
        expect(value).to.equal(a + b + c);
      });
    });

  });

  describe('Invalid closure variables', function () {
    var f = function () {};

    closure(['f'], function (expr) { return eval(expr); });

    it('should reject an invalid value', function () {
      return server.execute(function () {
        return f;
      }).expectError(function (err) {
        expect(err.message).to.contain('cannot use a function');
      });
    });
  });

});
