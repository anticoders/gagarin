
describe('Using chai in the browser', function () {

  var server = meteor();

  describe('browser expect()', function () {

    var client = browser(server);

    it('should work', function () {
      return client  
      .execute(function(){
        var x = 2;
        var y = x + 3;
        expect(y).to.eql(5);
      });
    });

    xit('should work after changing domain get url', function () {
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

    var client = browser(server);

    it('should work', function () {
      return client  
      .execute(function(){
        [4, 11, 16].should.include.one.below(10);
        [4, 11, 17].should.contain.some.above(10);
        // WARN: chai-things `any` has issue w/ 5.x + 4.x mocha/chai, interestingly enough, changing 
        // the name of `any`->`foobar` in chai-things, resolved the issue, some works without issue.
        [4, 11, 18].should.not.contain.some.above(20);
        [{ a: 'cat' }, { a: 'dog' }].should.contain.a.thing.with.property('a', 'cat');
        [{ a: 'cat' }, { a: 'dog' }].should.contain.an.item.with.property('a', 'dog');
        [4, 11, 19].should.all.be.below(20);
        [{ a: 'cat' }, { a: 'dog' }].should.all.have.property('a');
        [4, 11, 20].should.all.be.above(2);
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

  describe('using chai asserters within browser.promise', function () {

    var client = browser(server);

    it('should not throw if the assertion holds', function () {
      return client.promise(function (resolve) {
        expect(true).to.be.true;
        resolve();
      });
    });

    it('should throw a descriptive error if the assertion fails derp', function () {
      return client.promise(function () {
        expect(true).to.be.false;
      })
      .expectError('expected true to be false');
    });

    it('should work', function () {
      return client.promise(function (resolve) {
        true.should.be.true;
        resolve();
      });
    });

  });

  describe('using chai asserters within browser.wait', function () {
    
    var client = browser(server);

    it('should not throw if the assertion holds', function () {
      return client.wait(1000, 'until something happens', function () {
        expect(true).to.be.true;
        return true;
      });
    });

    it('should throw a descriptive error if the assertion fails herp', function () {
      return client.wait(1000, 'until something happens', function () {
        expect(true).to.be.false;
      })
      .expectError('expected true to be false');
    });
    
    it('should work', function () {
      return client.wait(1000, 'until something happens', function () {
        true.should.be.true;
        return true;
      });
    });

  });

});
