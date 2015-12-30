import * as paths from '../src/index';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {join} from 'path';

chai.should();
chai.use(chaiAsPromised);

let pathToApp = join(__dirname, 'app');

describe('Test Path Utilities', () => {

  it('should find the right node executable path', () => {
    return paths.getNodePath(pathToApp)
      .should.eventually.equal(
        '/home/gagarin/.meteor/packages/meteor-tool/.1.1.10.12w37b1++os.osx.x86_64+web.browser+web.cordova/mt-os.osx.x86_64/dev_bundle/bin/node');
  });

  it('should find the right mongo executable path', () => {
    return paths.getMongoPath(pathToApp)
      .should.eventually.equal(
        '/home/gagarin/.meteor/packages/meteor-tool/.1.1.10.12w37b1++os.osx.x86_64+web.browser+web.cordova/mt-os.osx.x86_64/dev_bundle/mongodb/bin/mongod');
  });

  it('should find the right dev_bundle path', () => {
    return paths.getDevBundlePath(pathToApp)
      .should.eventually.equal(
        '/home/gagarin/.meteor/packages/meteor-tool/.1.1.10.12w37b1++os.osx.x86_64+web.browser+web.cordova/mt-os.osx.x86_64/dev_bundle');
  });

});