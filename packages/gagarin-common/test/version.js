import * as paths from '../src/index';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {join} from 'path';

chai.should();
chai.use(chaiAsPromised);

let pathToApp = join(__dirname, 'app');

describe('Test Version Utilities', () => {

  it('should find the right meteor version', () => {
    return paths.getMeteorVersion(pathToApp).should.eventually.equal('1.2.1');
  });

  it('should find the right gagarin version', () => {
    return paths.getGagarinPackageVersion(pathToApp).should.eventually.equal('0.4.11');
  });

});
