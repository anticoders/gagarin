var Promise = require('es6-promise').Promise;

describe('Helpers Misc.', function () {

  // TODO test afterFlush
  describe.skip('Built in Tracker helpers', function () {
    var server = meteor();
    var client = browser(server);
    it('afterFlush should schedule function for next flush', function () {
      return client
        .afterFlush()
    });
  });  

  describe('Built in server connections helpers', function () {
    var server = meteor();
    var client = browser(server);
    
    it('start in connected state.', function () {
      return client
        .wait(3000,'until connected',function(){
          return Meteor.status().connected===true;
        })
    });

    it('disconnect client from the server.', function () {
      return client
        .disconnect()
        .execute(function () {
          return Meteor.status();
        })
        .then(function(res) {
          expect(res.connected).to.be.false;
        })
    });

    it('reconnect client to the server.', function () {
      return client
        .reconnect()
        .execute(function () {
          return Meteor.status();
        })
        .then(function(res) {
          expect(res.status).to.eql('connected');
          expect(res.connected).to.be.true;
        })
    });

  }); 

  //TODO where to put screenshot file for this test ? 
  describe.skip('screenshot', function () {

    var server = meteor();
    var client = browser(server);

    it('should save a screenshot to file.', function () {
      return client
        .screenshot()
        .then(function(res) {
          //assert file exists and is named by today's date and has some bytes
        })
    });
  });

  describe('Custom user-defined helpers', function () {

    var server = meteor({
      helpers: {
        sleepFor100ms: function () {
          return this.then(function () {
            return new Promise(function (resolve) {
              setTimeout(resolve, 100);
            });
          });
        },
      },
    });

    var client = browser(server, {
      helpers: {
        sleepFor100ms: function () {
          return this.then(function () {
            return new Promise(function (resolve) {
              setTimeout(resolve, 100);
            });
          });
        },
      },
    });

    it('should be able to use a custom helper on the server', function () {
      return server.sleepFor100ms();
    });

    it('should be able to use a custom helper on the client', function () {
      return client.sleepFor100ms();
    });

  });

});
