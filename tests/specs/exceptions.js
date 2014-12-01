var expect = require('chai').expect;

describe.skip('Reporting Exceptions', function () {

  describe('Given the app does not build properly', function () {

    // for this part, we should use the build_error app

    it('should throw an error', function () {
      expect(false).to.be.true;
    });

    it('the error should contain useful information', function () {
      expect(false).to.be.true;
    });

  });

  describe('Given the app is properly built', function () {

    // for this part, we should use the example app

    // SERVER SIDE ERRORS

    describe('If the app throws an uncought error', function () {

      it('should report the error properly', function () {
        expect(false).to.be.true;
      });

      it('should respawn the meteor process', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the server-side injected script throws an error', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the server-side promise is rejected', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the server-side wait fails due to some error', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the server-side wait fails due to timeout', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    // CLIENT SIDE ERRORS

    describe('If the client-side injected script throws an error', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the client-side promise is rejected', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the client-side wait fails due to some error', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

    describe('If the client-side wait fails due to timeout', function () {

      it('should be properly reported', function () {
        expect(false).to.be.true;
      });

      it('the error message should contain useful information', function () {
        expect(false).to.be.true;
      });

    });

  });

});
