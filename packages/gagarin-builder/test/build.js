import * as paths from '../src/paths';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

let pathToApp = __dirname + '/app';

describe('A dummy test', function () {
  it('should just work', () => {
    assert.equal(true, true);
  });
});
