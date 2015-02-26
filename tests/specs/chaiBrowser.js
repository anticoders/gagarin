
describe('Using chai in the browser', function () {

  describe('browser chai.expect()', function () {

    var server = meteor();
    var client = browser(server);

    it('should work', function () {
      return client  
      .execute(function(){
        var x = 2;
        var y = x + 3;
        chai.expect(y).to.eql(5);
      });
    });
  });

  describe('browser expect()', function () {

    var server = meteor();
    var client = browser(server);

    it('should work', function () {
      return client  
      .execute(function(){
        var x = 2;
        var y = x + 3;
        expect(y).to.eql(5);
      });
    });

    it('should work after get url', function () {
      return client
      .get('http://www.google.com')
      .execute(function(){
         expect(4).to.eql(4);
      });
    });

    it('should work given parameters', function () {
      return client
      .execute(function(a,b,c){
        expect(a+b+c).to.eql(6);
      },[1,2,3]);
    });

    it('should throw an error if assertion fails ', function () {
      return client
      .execute(function(){
        var x = 2;
        var y = x + 3;
        expect(y).to.eql(4);
      })
      .expectError('expected 5 to deeply equal 4');
    });

  });

  describe('browser should()', function () {

    var server = meteor();
    var client = browser(server);

    it('should work', function () {
      return client  
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
      return client  
      .execute(function(){
        [4, 11, 15].should.contain.some.above(20)
      })
      .expectError('expected an element of [ 4, 11, 15 ] to be above 20');
    });

    it('should throw error if assertion fails given parameters', function () {
      return client
      .execute(function(a,b,c){
        expect(a+b+c).to.eql(4);
      },[1,2,3])
      .expectError('expected 6 to deeply equal 4');
    });

  });

});
