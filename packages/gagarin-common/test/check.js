import * as check from '../src/index';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {join} from 'path';
import {writeFile, unlink} from 'fs';

chai.should();
chai.use(chaiAsPromised);

let pathToApp = join(__dirname, 'app');
let pathToLock = join(pathToApp, '.meteor', 'local', 'db', 'mongod.lock');

describe('Test Check Utilities', () => {

  describe('File existence', () => {

    it('should tell if path exists', () => {
      return check.checkPathExists(join(pathToApp, '.gagarin', 'local', 'gagarin.pathToNode')).should.eventually.be.true;
    });

    it('should tell if path does not exists', () => {
      return check.checkPathExists(join(pathToApp, '.gagarin', 'noSuchFile')).should.eventually.be.false;
    });

  });

  describe('Given meteor is running', () => {

    // TODO: maybe we should really start the meteor process?

    before(done => {
      writeFile(pathToLock, 'anything', { encoding: 'utf8' }, done);
    });

    after(done => {
      writeFile(pathToLock, '', { encoding: 'utf8' }, done);
    });

    it('should check if meteor is running', () => {
      return check.checkMeteorIsRunning(pathToApp).should.eventually.be.true;
    });

  });

  describe('Given meteor is not running', () => {

    it('should check if meteor is running', () => {
      return check.checkMeteorIsRunning(pathToApp).should.eventually.be.false;
    });

  });

});
