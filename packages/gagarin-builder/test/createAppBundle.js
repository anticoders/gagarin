import createAppBundle from '../src/createAppBundle';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {join} from 'path';

chai.should();
chai.use(chaiAsPromised);

let pathToApp = join(__dirname, '/app');

describe('Test App Bundle Creation', function () {

  this.timeout(60000);

  it('should create meteor bundle', () => {
    return createAppBundle(pathToApp).should.eventually.include('/app/.gagarin/local/bundle/main.js');
  });
});
