var async  = require('../../lib/tools/async');
var sinon  = require('sinon');
var expect = require('chai').expect;

describe('Test Async Tools.', function () {

  describe('Timeout wrapper,', function () {

    it('should throw error after 100ms', function (done) {
      var myAsyncFunction = async.timeout(100, function () {});
      myAsyncFunction(function (err) {
        expect(err.code).to.equal('TIMEOUT');
        done();
      });
    });
    
    it('should not throw error if function returns', function (done) {
      var myAsyncFunction = async.timeout(100, function (cb) {
        setTimeout(cb, 50);
      });
      myAsyncFunction(function (err) {
        expect(err).to.be.falsy;
        setTimeout(function () {
          done();
        }, 100);
      });
    });

    it('should properly pass arguments', function (done) {
      var myAsyncFunction = async.timeout(100, function (a, b, c, d, cb) {
        setTimeout(function () {
          cb(null, a + b + c + d);
        }, 50);
      });
      myAsyncFunction(1, 2, 3, 4, function (err, res) {
        expect(err).to.be.falsy;
        expect(res).to.equal(10);
        done();
      });
    });

  });

  describe('Retry wrapper,', function () {

    it('should retry after a failure', function (done) {
      var counter = 10;
      var myAsyncFunction = async.retry(counter, function (cb) {
        setTimeout(function () {
          if (counter > 0) {
            cb(new Error('Failure.'));
            counter -= 1;
          } else {
            cb(); // success ...
          }
        }, 10);
      });
      myAsyncFunction(done);
    });

    it('should not retry more than requested', function (done) {
      var counter = 10;
      var myAsyncFunction = async.retry(counter - 1, function (cb) {
        setTimeout(function () {
          if (counter > 0) {
            cb(new Error('Failure.'));
            counter -= 1;
          } else {
            cb(); // success ...
          }
        }, 10);
      });
      myAsyncFunction(function (err) {
        expect(err).to.be.truthy;
        done();
      });
    });

  });

});
