var Promise = require('es6-promise').Promise;

describe('Helpers', function () {

  describe('Chai.expect() invoked inside the client context', function () {

    var server = meteor();
    var client = browser(server);


    it('should work', function () {
      return client
      .execute(function(){
        var x = 2;
        var y = x + 3;
        expect(y).to.eql(5);
      })
    });

    it('should work given parameters', function () {
      return client
      .execute(function(a,b,c){

        expect(a+b+c).to.eql(6);

      },[1,2,3])

    });

    it('should throw an error if assertion fails ', function () {
      return client
      .execute(function(){
         // inside here in execute this === window;  evaluates to true in the client
         // so is "this" the window object ? 
        var x = 2;
        var y = x + 3;
        try{
          expect(y).to.eql(4);
        }catch(e){return e.message;}
      })
      .then(function(res){
        expect(res).to.contain('expected 5 to deeply equal 4');
      })

    });

    it('should throw an error if assertion fails given parameters', function () {
      return client
      .execute(function(a,b,c){

        try{
          expect(a+b+c).to.eql(4);
        }catch(e){return e.message;}

      },[1,2,3])
      .then(function(res){
        expect(res).to.contain('expected 6 to deeply equal 4');
      })
    });

  });

  describe('Built in helpers', function () {

    var server = meteor();
    var client = browser(server);

    it('should be able to use sendKeys', function () {
      return client
        .sendKeys('input[type=text]', 'abc')
        .expectValueToEqual('input[type=text]', 'abc');
    });

    it('should be able to use click', function () {
      return client
        .click('input[type=button]')
        .expectTextToContain('p', '1');
    });
    
  });

  describe('Custom user-defined helpers', function () {

    var server = meteor({
      helpers: {
        sleepForOneSecond: function () {
          return this.then(function () {
            return new Promise(function (resolve) {
              setTimeout(resolve, 1000);
            });
          });
        },
      },
    });

    it('should be able to use a custom helper', function () {
      return server.sleepForOneSecond();
    });

  });

});
