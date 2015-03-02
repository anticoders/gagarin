
describe('Built in assertion helpers', function () {
  
  var server = meteor();
  var client = browser(server);

  it('assertion helpers should work', function () {
    return client
      .expectExist('#visibleChild')
      .expectNotExist('#noExist')
      .expectVisible('#visibleChild')
      .expectNotVisible('#hiddenChild')
      .expectValueToEqual('#getValue','Get value.')
      .expectTextToEqual('#getText','<h3>Get text.</h3>')
      .expectTextToContain('#getText','Get tex')
      .expectToHaveClass('#getClass','myClass')
  });

  describe('checkIfExist', function () {
    it('should return true if element exists', function () {
      return client
        .checkIfExist('#visibleElement')
        .then(function(res) {
          expect(res).to.be.true;
        })
    });

    it('should return false if element does not exist', function () {
      return client
        .checkIfExist('#noExist')
        .then(function(res) {
          expect(res).to.be.false;
        })
    });
  });

  describe('checkIfVisible ', function () {
    it('should return true if element is visible', function () {
      return client
        .checkIfVisible('#visibleElement')
        .then(function(res) {
          expect(res).to.be.true;
        })
    });

    it('should return true if element and ancestors are visible', function () {
      return client
        .checkIfVisible('#visibleChild')
        .then(function(res) {
          expect(res).to.be.true;
        })
    });

    it('should return false if element does not exist', function () {
      return client
        .checkIfVisible('#noExist')
        .then(function(res) {
          expect(res).to.be.false;
        })
    });

    it('should return false if element is not visible', function () {
      return client
        .checkIfVisible('#hiddenElement')
        .then(function(res) {
          expect(res).to.be.false;
        })
    });

    it('should return false if any ancestors are not visible', function () {
      return client
        .checkIfVisible('#hiddenChild')
        .then(function(res) {
          expect(res).to.be.false;
        })
    });

    it('should work for fixed and absolute position elements', function () {
      return client
        .expectVisible('#fixedPositionDiv')
        .expectVisible('#absolutePositionDiv')
        .expectNotVisible('#fixedPositionDivHidden')
        .expectNotVisible('#absolutePositionDivHidden')
    });

  });
});
