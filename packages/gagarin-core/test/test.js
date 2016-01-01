import * as paths from '../src/index';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

describe('A dummy test suite', function () {
  it('should be fine', function () {
    true.should.be.true;
  });
});
