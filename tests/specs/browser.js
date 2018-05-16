
var Promise = require('es6-promise').Promise;
var expect = require('chai').expect;
var path = require('path');

describe('Tests with browser', function () {

  var server = meteor({});

  var browser1 = browser(server);
  var browser2 = browser(server);
  
  it('should be ok', function () {
    return Promise.resolve('should be ok');
  });

  it('execute should work in browser', function () {
    return browser1.execute(function (value) {
        return value;
      }, [ 'someValue' ])
      .then(function (value) {
        expect(value).to.equal('someValue');
      });
  });

  // TODO: we should implement more tests for custom helpers
  it('should be able to use standard helpers', function () {
    return browser1.getText('h1').then(function (value) {
      expect(value).to.contain('Hello World!');
    });
  });

  var id = Math.floor(1000 * Math.random()).toString();

  describe('Database insertions', function () {
    before(function () {
      return browser1
        .promise(function (resolve, reject, id) {
          resolve( Items.insert({_id: id, foo: 'bar'}) )
        }, [ id ])
        .then(function (value) {
          expect(value).to.equal(id);
        });
    });

    it('db insert should work in browser', function () {
      return browser1.wait(
        5000,
        'for find to resolve',
        function(){
          return Items.findOne({});
        }).then(function (item) {
          expect(item).not.to.be.empty;
          expect(item._id).to.equal(id);
          expect(item.foo).to.equal('bar');
        });
    });
    
    it('the same element should be present on server', function () {
      return server.wait(
        5000,
        'for find to resolve',
        function(id){
          return Items.findOne({_id: id});; //window.herp;//Items.find({}).fetch();
        }, [id]).then(function (value) {
          expect(value).not.to.be.empty;
          expect(value._id).to.equal(id);
        });
    });

  });

  describe('Restarting server', function () {

    var value    = 0;

    this.timeout(20000);

    before(function () {
      return server.restart(100);
    });

    before(function () {
      return browser2
        .execute(function(){
          return reset;
        })
        .then(function (numberOfResets) {
          value = numberOfResets;
        });
    })

    it ('should be all right', function () {
      return server.execute(function ()  {
          return Meteor.release;
        })
        .then(function (release) {
          expect(release).to.be.ok;
        });
    });

    it('should recognize that the server was restarted', function () {
      return browser2
        .wait(7000, 'until status.connected === true', function () {
          return Meteor.connection.status().connected;
        })
        .execute(function(){
          console.log("thisss", this);
          return reset;
        })
        .then(function (numberOfResets) {
          // XXX the first "reset" occurs on startup, so we have two resets up to this point
          expect(numberOfResets).to.equal(value + 1);
        });
    });

    it ('another restart shoud work as well', function () {
      return server.restart(2000).then(function () {
        return browser2
          .wait(7000, 'until status.connected === true', function () {
            return Meteor.connection.status().connected;
          })
          .execute(function(){
            console.log("thisss", this);
            return reset;
          })
          .then(function (numberOfResets) {
            expect(numberOfResets).to.equal(value + 2);
          });
      });
    });

  });

});
