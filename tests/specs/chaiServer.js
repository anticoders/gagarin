
describe('Using chai on the server', function () {

  var server = meteor();

  describe('server chai.expect()', function () {

    it('should work', function () {
      return server  
      .execute(function(){
        var x = 2;
        var y = x + 3;
        chai.expect(y).to.eql(5);
      });
    });
  });

  describe('server expect()', function () {

    it('should work', function () {
      return server  
      .execute(function(){
        var x = 2;
        var y = x + 3;
        expect(y).to.eql(5);
      });
    });

    it('should work given parameters', function () {
      return server
      .execute(function(a,b,c){
        expect(a+b+c).to.eql(6);
      },[1,2,3]);
    });

    it('should throw an error if assertion fails ', function () {
      return server
      .execute(function(){
        var x = 2;
        var y = x + 3;
        expect(y).to.eql(4);
      })
      .expectError('expected 5 to deeply equal 4');
    });

  });

  describe('server should()', function () {

    it('should work', function () {
      return server  
      .execute(function(){
        [4, 11, 15].should.include.one.below(10);
        [4, 11, 15].should.contain.some.above(10);
        [4, 11, 15].should.not.contain.any.above(20);
        [{ a: 'cat' }, { a: 'dog' }].should.contain.a.thing.with.property('a', 'cat');
        [{ a: 'cat' }, { a: 'dog' }].should.contain.an.item.with.property('a', 'dog');
        [4, 11, 15].should.all.be.below(20);
        [{ a: 'cat' }, { a: 'dog' }].should.all.have.property('a');
        [4, 11, 15].should.all.be.above(2);
        [{ a: 'cat' }, { a: 'cat' }].should.all.have.property('a', 'cat');
      })
    });

    it('should throw error if assertion fails ', function () {
      return server  
      .execute(function(){
        [4, 11, 15].should.contain.some.above(20)
      })
      .expectError('expected an element of [ 4, 11, 15 ] to be above 20');
    });

    it('should throw error if assertion fails given parameters', function () {
      return server
      .execute(function(a,b,c){
        expect(a+b+c).to.eql(4);
      },[1,2,3])
      .expectError('expected 6 to deeply equal 4');
    });

  });

  describe('using chai asserters within server.promise', function () {

    it('should not throw if the assertion holds', function () {
      return server.promise(function (resolve) {
        expect(true).to.be.true;
        resolve();
      });
    });

    it('should throw a descriptive error if the assertion fails', function () {
      return server.promise(function () {
        expect(true).to.be.false;
      })
      .expectError('expected true to be false');
    });

    it('should work', function () {
      return server.promise(function (resolve) {
        true.should.be.true;
        resolve();
      });
    });

  });

  describe('using chai asserters within server.wait', function () {

    it('should not throw if the assertion holds', function () {
      return server.wait(1000, 'until something happens', function () {
        expect(true).to.be.true;
        return true;
      });
    });

    it('should throw a descriptive error if the assertion fails', function () {
      return server.wait(1000, 'until something', function () {
        expect(true).to.be.false;
      })
      .expectError('expected true to be false');
    });

    it('should work', function () {
      return server.wait(1000, 'until something happens', function () {
        true.should.be.true;
        return true;
      });
    });

  });

});
